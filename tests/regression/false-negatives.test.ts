import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadCorpusOrThrow } from '../fixtures/corpus-loader';
import { RegexEngine } from '../../src/engines/RegexEngine';
import { EntropyAnalyzer } from '../../src/engines/EntropyAnalyzer';
import { RegressionChecker } from './regression-checker';
import type { RegressionBaseline, SampleDetectionResult } from './types';

const BASELINE_PATH = path.join(process.cwd(), 'tests/regression/regression-baseline.json');
const MAX_FNR = Number(process.env.MAX_ABSOLUTE_FNR ?? '0.02');

describe('WO-059: false-negative regression suite', () => {
  it('fails when previously-detected baseline samples regress', async () => {
    const started = Date.now();
    expect(fs.existsSync(BASELINE_PATH)).toBe(true);
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as RegressionBaseline;
    const corpus = await loadCorpusOrThrow();
    const byId = new Map(
      corpus.map((s) => [String((s as { id?: string }).id ?? ''), s])
    );

    const regex = new RegexEngine();
    const entropy = new EntropyAnalyzer();
    const results: SampleDetectionResult[] = [];
    let positives = 0;
    let fn = 0;

    for (const sample of baseline.samples) {
      const src = byId.get(sample.sampleId);
      const text = src
        ? String((src as { input?: string; text?: string }).input ?? (src as { text?: string }).text ?? '')
        : '';
      const findings = [
        ...(await regex.analyze({ text, lines: text.split('\n') })),
        ...(await entropy.analyze({ text, lines: text.split('\n') })),
      ];
      const detected = findings.length > 0;
      results.push({
        sampleId: sample.sampleId,
        detected,
        findingCount: findings.length,
        category: sample.category,
      });
      if (sample.expectedDetected) {
        positives++;
        if (!detected) fn++;
      }
    }

    const report = new RegressionChecker().checkForRegressions(
      baseline,
      results,
      fn,
      positives
    );

    if (report.totalRegressed > 0) {
      const detail = report.regressions
        .map((r) => `${r.sampleId} [${r.category}] expected=${r.expectedFindingCount} actual=${r.actualFindingCount} — ${r.description}`)
        .join('\n');
      expect.fail(`False-negative regressions detected:\n${detail}`);
    }

    if (process.env.FORCE_FN_GATE === 'true') {
      expect(report.absoluteFnr).toBeLessThanOrEqual(MAX_FNR);
    }

    expect(Date.now() - started).toBeLessThan(30_000);
  }, 60_000);
});
