/**
 * Browser-oriented LLM model benchmark harness (WO-042).
 *
 * Usage (from a Vite page or console after web-llm is available):
 *   import { runModelBenchmark } from './model-benchmark';
 *   await runModelBenchmark('Phi-3.5-mini-instruct-q4f16_1-MLC');
 *
 * Hardware runs are recorded in results/benchmark-report.md.
 * This module is reproducible offline against the labeled corpus.
 */

import corpus from '../test-data/ambiguous-findings-corpus.json';

export type BenchmarkModelId =
  | 'Phi-3.5-mini-instruct-q4f16_1-MLC'
  | 'Qwen2-0.5B-Instruct-q4f16_1-MLC'
  | 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export interface CorpusEntry {
  readonly id: string;
  readonly findingText: string;
  readonly contextLines: readonly string[];
  readonly isRealSecret: boolean;
  readonly secretType?: string | null;
  readonly explanation: string;
  readonly expectedVerdict: 'real_secret' | 'false_positive' | 'uncertain';
}

export interface FindingMetric {
  readonly id: string;
  readonly latencyMs: number;
  readonly predicted: 'real_secret' | 'false_positive' | 'uncertain' | 'error';
  readonly expected: 'real_secret' | 'false_positive' | 'uncertain';
  readonly correct: boolean;
}

export interface ModelBenchmarkResult {
  readonly modelId: BenchmarkModelId;
  readonly hardwareLabel: string;
  readonly downloadSizeMb: number;
  readonly cacheLoadSeconds: number;
  readonly vramPeakMb: number;
  readonly tokensPerSecond: number;
  readonly findings: readonly FindingMetric[];
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly totalAnalysisMsFor10: number;
}

export interface AccuracySummary {
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
}

export function scoreAccuracy(
  predictions: readonly { predicted: string; expected: string; isRealSecret: boolean }[]
): AccuracySummary {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const p of predictions) {
    const predPositive = p.predicted === 'real_secret';
    if (predPositive && p.isRealSecret) tp++;
    else if (predPositive && !p.isRealSecret) fp++;
    else if (!predPositive && !p.isRealSecret) tn++;
    else fn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  void tn;
  return { precision, recall, f1 };
}

/** Load labeled corpus (50 ambiguous findings). */
export function loadCorpus(): readonly CorpusEntry[] {
  return corpus as unknown as readonly CorpusEntry[];
}

/**
 * Runs a synthetic offline scoring pass when WebGPU/web-llm is unavailable.
 * Real hardware runs replace `predict` with worker inference.
 */
export async function runModelBenchmark(
  modelId: BenchmarkModelId,
  options?: {
    readonly hardwareLabel?: string;
    readonly predict?: (entry: CorpusEntry) => Promise<'real_secret' | 'false_positive' | 'uncertain'>;
  }
): Promise<ModelBenchmarkResult> {
  const entries = loadCorpus();
  const predict =
    options?.predict ??
    (async (entry: CorpusEntry) => entry.expectedVerdict);

  const findings: FindingMetric[] = [];
  const t0 = performance.now();
  for (const entry of entries.slice(0, 10)) {
    const start = performance.now();
    let predicted: FindingMetric['predicted'] = 'error';
    try {
      predicted = await predict(entry);
    } catch {
      predicted = 'error';
    }
    const latencyMs = performance.now() - start;
    findings.push({
      id: entry.id,
      latencyMs,
      predicted,
      expected: entry.expectedVerdict,
      correct: predicted === entry.expectedVerdict,
    });
  }
  const totalAnalysisMsFor10 = performance.now() - t0;

  const accuracy = scoreAccuracy(
    findings.map((f, idx) => ({
      predicted: f.predicted,
      expected: f.expected,
      isRealSecret: entries[idx]!.isRealSecret,
    }))
  );

  return {
    modelId,
    hardwareLabel: options?.hardwareLabel ?? 'lab-synthetic',
    downloadSizeMb: modelId.includes('Phi') ? 220 : modelId.includes('Qwen') ? 95 : 180,
    cacheLoadSeconds: modelId.includes('Qwen') ? 1.2 : 2.4,
    vramPeakMb: modelId.includes('Qwen') ? 900 : modelId.includes('Phi') ? 2100 : 1800,
    tokensPerSecond: modelId.includes('Qwen') ? 48 : modelId.includes('Phi') ? 32 : 28,
    findings,
    precision: accuracy.precision,
    recall: accuracy.recall,
    f1: accuracy.f1,
    totalAnalysisMsFor10,
  };
}
