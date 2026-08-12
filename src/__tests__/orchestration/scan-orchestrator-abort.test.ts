import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScanOrchestrator } from '../../orchestration/scan-orchestrator';
import { SlowMockEngine } from '../fixtures/mock-engines';

describe('WO-027: ScanOrchestrator Abort Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts before any layer completes and yields an aborted progress event with no findings', async () => {
    const l1 = new SlowMockEngine({ name: 'RegexEngine', layer: 1, delayMs: 5000 });
    const l3 = new SlowMockEngine({ name: 'EntropyAnalyzer', layer: 3, delayMs: 5000 });
    const orchestrator = new ScanOrchestrator([l1, l3]);
    const generator = orchestrator.scan('console.log("secret");');

    const first = await generator.next();
    expect(first.value?.status).toBe('scanning');

    orchestrator.abort();

    const aborted = await generator.next();
    expect(aborted.done).toBe(false);
    expect(aborted.value?.status).toBe('aborted');
    expect(aborted.value?.findings).toHaveLength(0);
    expect(aborted.value?.note).toContain('Layer 1 (Regex)');
    expect(aborted.value?.note).toContain('Layer 3 (Entropy)');

    const done = await generator.next();
    expect(done.done).toBe(true);
  });

  it('treats abort() with no active scan as a no-op', () => {
    const orchestrator = new ScanOrchestrator([]);

    expect(() => orchestrator.abort()).not.toThrow();
  });
});