import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryMonitor } from './MemoryMonitor';

describe('WO-054: MemoryMonitor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isApproachingLimit false below 3.0 GB via measureUserAgentSpecificMemory', async () => {
    vi.stubGlobal('performance', {
      measureUserAgentSpecificMemory: async () => ({ bytes: 2.5 * 1024 * 1024 * 1024 }),
    });
    const mon = new MemoryMonitor();
    await mon.refresh();
    expect(mon.isApproachingLimit()).toBe(false);
    expect(mon.getApiSource()).toBe('measureUserAgentSpecificMemory');
  });

  it('isApproachingLimit true above 3.0 GB', async () => {
    vi.stubGlobal('performance', {
      measureUserAgentSpecificMemory: async () => ({ bytes: 3.1 * 1024 * 1024 * 1024 }),
    });
    const mon = new MemoryMonitor();
    await mon.refresh();
    expect(mon.isApproachingLimit()).toBe(true);
  });

  it('isAtCeiling true above 3.5 GB', async () => {
    vi.stubGlobal('performance', {
      measureUserAgentSpecificMemory: async () => ({ bytes: 3.6 * 1024 * 1024 * 1024 }),
    });
    const mon = new MemoryMonitor();
    await mon.refresh();
    expect(mon.isAtCeiling()).toBe(true);
  });

  it('falls back to performance.memory', async () => {
    vi.stubGlobal('performance', {
      memory: { usedJSHeapSize: 1024 * 1024 * 500 },
    });
    const mon = new MemoryMonitor();
    await mon.refresh();
    expect(mon.getApiSource()).toBe('performance.memory');
    expect(mon.getCurrentStatus().usageMB).toBeCloseTo(500, 0);
  });

  it('falls back to heuristic when APIs missing', async () => {
    vi.stubGlobal('performance', {});
    const mon = new MemoryMonitor();
    mon.setModelLoaded(true);
    mon.setInputBytes(10 * 1024 * 1024);
    await mon.refresh();
    expect(mon.getApiSource()).toBe('heuristic');
    expect(mon.getCurrentStatus().usageMB).toBeGreaterThan(1500);
  });

  it('boundary: exactly 3072 MB is not approaching; 3073 is', async () => {
    const mon = new MemoryMonitor();
    vi.stubGlobal('performance', {
      measureUserAgentSpecificMemory: async () => ({ bytes: 3072 * 1024 * 1024 }),
    });
    await mon.refresh();
    expect(mon.isApproachingLimit()).toBe(false);

    vi.stubGlobal('performance', {
      measureUserAgentSpecificMemory: async () => ({ bytes: 3073 * 1024 * 1024 }),
    });
    await mon.refresh();
    expect(mon.isApproachingLimit()).toBe(true);
  });
});
