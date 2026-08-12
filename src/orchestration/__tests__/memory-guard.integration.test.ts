import { describe, expect, it, vi } from 'vitest';
import { ScanOrchestrator } from '../scan-orchestrator';
import { MockDetectionEngine } from '@/__fixtures__/mock-engines';
import type { MemoryMonitor } from '@/infra/MemoryMonitor';

describe('WO-054: memory guard integration', () => {
  it('skips LLM and emits MEMORY_WARNING when approaching limit', async () => {
    const memoryMonitor = {
      setInputBytes: vi.fn(),
      refresh: vi.fn(async () => ({})),
      isApproachingLimit: () => true,
      isAtCeiling: () => false,
    } as unknown as MemoryMonitor;

    const llm = new MockDetectionEngine({
      name: 'llm',
      layer: 2,
      findingsToReturn: [{
        id: 'l1', secretType: 'api_key', confidence: 'high', lineNumber: 1,
        startColumn: 0, endColumn: 4, maskedValue: '****', detectionLayer: 2, patternId: 'x',
      }],
    });
    const regex = new MockDetectionEngine({
      name: 'regex', layer: 1,
      findingsToReturn: [{
        id: 'r1', secretType: 'api_key', confidence: 'medium', lineNumber: 1,
        startColumn: 0, endColumn: 4, maskedValue: '****', detectionLayer: 1, patternId: 'x',
      }],
    });
    const orch = new ScanOrchestrator([regex, llm], { memoryMonitor });
    const events = [];
    for await (const e of orch.scan('const x = "medium confidence finding here"')) events.push(e);
    expect(events.some((e) => e.note === 'MEMORY_WARNING' || String(e.stage).includes('MEMORY_WARNING'))).toBe(true);
    expect(llm.analyzeCallCount).toBe(0);
    expect(events.at(-1)?.status).toBe('complete');
  });
});
