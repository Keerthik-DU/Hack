import { describe, expect, it } from 'vitest';
import { RegexEngine } from '@/engines/RegexEngine';
import { makeInput, timeMs, THRESHOLDS } from './bench-helpers';

describe('WO-056: regex benchmark', () => {
  it('regex 10k chars under threshold', async () => {
    const engine = new RegexEngine();
    const input = makeInput(10_000);
    const ms = await timeMs(() => engine.analyze({ text: input, lines: input.split('\n') }));
    if (process.env.BENCH_HARD === 'true') {
      expect(ms).toBeLessThan(THRESHOLDS.regex10kMs);
    } else {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(30_000);
    }
  }, 60_000);
});
