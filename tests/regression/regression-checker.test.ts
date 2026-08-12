import { describe, expect, it } from 'vitest';
import { RegressionChecker } from './regression-checker';
import type { RegressionBaseline } from './types';

const baseline: RegressionBaseline = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  samples: [
    { sampleId: 'a', category: 'aws', expectedDetected: true, findingCount: 1, lastVerifiedCommit: 'abc' },
    { sampleId: 'b', category: 'stripe', expectedDetected: true, findingCount: 2, lastVerifiedCommit: 'abc' },
    { sampleId: 'c', category: 'neg', expectedDetected: false, findingCount: 0, lastVerifiedCommit: 'abc' },
  ],
};

describe('WO-059: RegressionChecker', () => {
  const checker = new RegressionChecker();

  it('reports zero regressions on stable results', () => {
    const report = checker.checkForRegressions(baseline, [
      { sampleId: 'a', detected: true, findingCount: 1 },
      { sampleId: 'b', detected: true, findingCount: 2 },
      { sampleId: 'new', detected: true, findingCount: 1 },
    ]);
    expect(report.totalRegressed).toBe(0);
    expect(report.totalChecked).toBe(2);
  });

  it('detects a single regression', () => {
    const report = checker.checkForRegressions(baseline, [
      { sampleId: 'a', detected: false, findingCount: 0 },
      { sampleId: 'b', detected: true, findingCount: 2 },
    ]);
    expect(report.totalRegressed).toBe(1);
    expect(report.regressions[0]?.sampleId).toBe('a');
  });

  it('detects multiple regressions', () => {
    const report = checker.checkForRegressions(baseline, [
      { sampleId: 'a', detected: false, findingCount: 0 },
      { sampleId: 'b', detected: false, findingCount: 0 },
    ]);
    expect(report.totalRegressed).toBe(2);
  });

  it('ignores new samples not in baseline', () => {
    const report = checker.checkForRegressions(baseline, [
      { sampleId: 'a', detected: true, findingCount: 1 },
      { sampleId: 'b', detected: true, findingCount: 2 },
      { sampleId: 'brand-new', detected: false, findingCount: 0 },
    ]);
    expect(report.totalRegressed).toBe(0);
  });

  it('warns when baseline sample missing from results', () => {
    const report = checker.checkForRegressions(baseline, [
      { sampleId: 'a', detected: true, findingCount: 1 },
    ]);
    expect(report.warnings.some((w) => w.includes('b'))).toBe(true);
    expect(report.totalRegressed).toBe(1);
  });

  it('throws on empty baseline', () => {
    expect(() =>
      checker.checkForRegressions(
        { version: 1, generatedAt: '', samples: [] },
        []
      )
    ).toThrow(/Empty regression baseline/);
  });
});
