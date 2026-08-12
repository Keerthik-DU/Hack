import { describe, expect, it } from 'vitest';
import { evaluateFalseNegativeGate } from './false-negative-gate';
import type { MetricsReport } from './types';

const base: MetricsReport = {
  tp: 10,
  fp: 0,
  fn: 0,
  tn: 5,
  precision: 1,
  recall: 1,
  f1: 1,
  fpr: 0,
  fnr: 0,
  totalSamples: 15,
  timestamp: new Date().toISOString(),
  commitSha: 'test',
  thresholds: { recall: 0.95, precision: 0.85 },
  passed: true,
  perCategory: {},
};

describe('WO-059: false-negative gate', () => {
  it('passes when FN is zero', () => {
    expect(evaluateFalseNegativeGate(base).pass).toBe(true);
  });
  it('fails when FN > 0', () => {
    expect(evaluateFalseNegativeGate({ ...base, fn: 2 }).pass).toBe(false);
  });
});
