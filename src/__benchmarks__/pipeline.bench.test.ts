import { describe, expect, it } from 'vitest';
import { createDefaultScanOrchestrator } from '@/orchestration/create-default-orchestrator';
import { makeInput, timeMs, THRESHOLDS } from './bench-helpers';

describe('WO-056: pipeline benchmark', () => {
  it('full pipeline 100k under threshold (regex+entropy path)', async () => {
    const orch = createDefaultScanOrchestrator({ enableComputationWorker: false });
    const input = makeInput(100_000);
    const ms = await timeMs(async () => {
      for await (const _ of orch.scan(input)) {
        /* drain */
      }
    });
    if (process.env.BENCH_HARD === 'true') {
      expect(ms).toBeLessThan(THRESHOLDS.pipeline100kMs);
    } else {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(120_000);
    }
  }, 180_000);
});
