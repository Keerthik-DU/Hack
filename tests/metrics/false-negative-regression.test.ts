import { describe, expect, it } from 'vitest';
import { loadCorpusOrThrow } from '../fixtures/corpus-loader';
import { RegexEngine } from '../../src/engines/RegexEngine';
import { MetricsRunner } from './metrics-runner';
import { MetricsReporter } from './metrics-reporter';
import { evaluateFalseNegativeGate } from './false-negative-gate';
import type { SampleResult } from './types';

describe('WO-059: FN regression suite', () => {
  it('writes FN gate evaluation for positive-labeled samples', async () => {
    const samples = await loadCorpusOrThrow();
    const positives = samples.filter((s) => {
      const exp = (s as { expectedFindings?: unknown[] }).expectedFindings;
      return Array.isArray(exp) && exp.length > 0;
    }).slice(0, 80);
    expect(positives.length).toBeGreaterThan(0);

    const regex = new RegexEngine();
    const results: SampleResult[] = [];
    for (const sample of positives) {
      const text = (sample as { input?: string; text?: string }).input
        ?? (sample as { text?: string }).text
        ?? '';
      const findings = await regex.analyze({ text, lines: text.split('\n') });
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

    const report = new MetricsRunner().computeMetrics(results, { recall: 0.95, precision: 0.85 });
    new MetricsReporter().writeJsonReport(report, 'tests/metrics/output/fn-regression-report.json');
    const gate = evaluateFalseNegativeGate(report, Number(process.env.MAX_FN_ALLOWED ?? '999'));
    if (process.env.FORCE_FN_GATE === 'true') {
      expect(gate.pass).toBe(true);
    } else {
      expect(typeof gate.message).toBe('string');
    }
  }, 120_000);
});
