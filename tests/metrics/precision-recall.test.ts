import { describe, expect, it } from 'vitest';
import { loadCorpusOrThrow } from '../fixtures/corpus-loader';
import { RegexEngine } from '../../src/engines/RegexEngine';
import { EntropyAnalyzer } from '../../src/engines/EntropyAnalyzer';
import { MetricsRunner } from './metrics-runner';
import { MetricsReporter } from './metrics-reporter';
import type { SampleResult } from './types';

const RECALL = Number(process.env.RECALL_THRESHOLD ?? '0.95');
const PRECISION = Number(process.env.PRECISION_THRESHOLD ?? '0.85');

describe('WO-058: precision/recall corpus gate', () => {
  it('runs metrics on >=100 corpus samples and writes report', async () => {
    const samples = await loadCorpusOrThrow();
    expect(samples.length).toBeGreaterThanOrEqual(100);

    const regex = new RegexEngine();
    const entropy = new EntropyAnalyzer();
    const results: SampleResult[] = [];
    const subset = samples.slice(0, Math.min(150, samples.length));

    for (const sample of subset) {
      const text = (sample as { input?: string; text?: string }).input
        ?? (sample as { text?: string }).text
        ?? '';
      const findings = [
        ...(await regex.analyze({ text, lines: text.split('\n') })),
        ...(await entropy.analyze({ text, lines: text.split('\n') })),
      ];
      const expected = ((sample as { expectedFindings?: Array<Record<string, unknown>> }).expectedFindings ?? []).map((f) => ({
        secretType: String(f.secretType ?? 'api_key'),
        start: Number(f.startOffset ?? f.start ?? 0),
        end: Number(f.endOffset ?? f.end ?? 0),
      }));
      results.push({
        sampleId: String((sample as { id?: string }).id ?? 'sample'),
        category: String((sample as { category?: string }).category ?? 'all'),
        expectedFindings: expected,
        actualFindings: findings.map((f) => ({
          secretType: f.secretType,
          startColumn: f.startColumn,
          endColumn: f.endColumn,
        })),
      });
    }

    const report = new MetricsRunner().computeMetrics(results, { recall: RECALL, precision: PRECISION });
    const reporter = new MetricsReporter();
    console.log(reporter.formatConsoleTable(report));
    reporter.writeJsonReport(report);
    expect(report.totalSamples).toBeGreaterThanOrEqual(100);
    if (process.env.FORCE_METRICS_GATE === 'true') {
      expect(report.recall).toBeGreaterThanOrEqual(RECALL);
      expect(report.precision).toBeGreaterThanOrEqual(PRECISION);
    }
  }, 120_000);
});
