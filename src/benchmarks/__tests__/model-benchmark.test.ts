import { describe, expect, it } from 'vitest';
import { loadCorpus, runModelBenchmark, scoreAccuracy } from '../model-benchmark';

describe('WO-042 model benchmark harness', () => {
  it('loads 50 labeled corpus entries (25 real / 25 FP)', () => {
    const corpus = loadCorpus();
    expect(corpus).toHaveLength(50);
    expect(corpus.filter((e) => e.isRealSecret)).toHaveLength(25);
    expect(corpus.filter((e) => !e.isRealSecret)).toHaveLength(25);
  });

  it('computes precision/recall/f1', () => {
    const summary = scoreAccuracy([
      { predicted: 'real_secret', expected: 'real_secret', isRealSecret: true },
      { predicted: 'false_positive', expected: 'false_positive', isRealSecret: false },
      { predicted: 'real_secret', expected: 'false_positive', isRealSecret: false },
    ]);
    expect(summary.precision).toBeCloseTo(0.5);
    expect(summary.recall).toBeCloseTo(1);
  });

  it('runModelBenchmark returns metrics for Phi default', async () => {
    const result = await runModelBenchmark('Phi-3.5-mini-instruct-q4f16_1-MLC', {
      hardwareLabel: 'unit-test',
    });
    expect(result.findings).toHaveLength(10);
    expect(result.f1).toBeGreaterThan(0.9);
    expect(result.totalAnalysisMsFor10).toBeGreaterThanOrEqual(0);
  });
});
