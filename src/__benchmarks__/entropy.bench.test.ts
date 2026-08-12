import { describe, expect, it } from 'vitest';
import { EntropyAnalyzer } from '@/engines/EntropyAnalyzer';
import { makeInput, timeMs, THRESHOLDS } from './bench-helpers';

describe('WO-056: entropy benchmark', () => {
  it('entropy 50k chars under threshold', async () => {
    const engine = new EntropyAnalyzer();
    const input = makeInput(50_000, 'entropy');
    const ms = await timeMs(() => engine.analyze({ text: input, lines: input.split('\n') }));
    if (process.env.BENCH_HARD === 'true') {
      expect(ms).toBeLessThan(THRESHOLDS.entropy50kMs);
    } else {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(60_000);
    }
  }, 90_000);
});
