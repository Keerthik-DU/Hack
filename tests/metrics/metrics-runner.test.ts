import { describe, expect, it } from 'vitest';
import { MetricsRunner } from './metrics-runner';

describe('WO-058: MetricsRunner', () => {
  const runner = new MetricsRunner();

  it('perfect detection', () => {
    const r = runner.computeMetrics([{
      sampleId: '1',
      expectedFindings: [{ secretType: 'api_key', start: 0, end: 10 }],
      actualFindings: [{ secretType: 'api_key', startColumn: 0, endColumn: 10 }],
    }]);
    expect(r.tp).toBe(1);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
  });

  it('all false negatives', () => {
    const r = runner.computeMetrics([{
      sampleId: '1',
      expectedFindings: [{ secretType: 'api_key', start: 0, end: 10 }],
      actualFindings: [],
    }]);
    expect(r.fn).toBe(1);
    expect(r.recall).toBe(0);
  });

  it('all false positives', () => {
    const r = runner.computeMetrics([{
      sampleId: '1',
      expectedFindings: [],
      actualFindings: [{ secretType: 'api_key', startColumn: 0, endColumn: 10 }],
    }]);
    expect(r.fp).toBe(1);
  });

  it('division by zero safe', () => {
    const r = runner.computeMetrics([]);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
  });
});
