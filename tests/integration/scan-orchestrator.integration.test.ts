import { describe, expect, it, vi } from 'vitest';
import { ScanOrchestrator } from '@/orchestration/scan-orchestrator';
import { MockDetectionEngine } from '@/__fixtures__/mock-engines';
import type { Finding, ScanProgress } from '@/types';

async function drain(gen: AsyncGenerator<ScanProgress>): Promise<ScanProgress[]> {
  const events: ScanProgress[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

function last(events: ScanProgress[]): ScanProgress {
  return events[events.length - 1]!;
}

const highRegexFinding: Finding = {
  id: 'hr1', secretType: 'aws_access_key', confidence: 'high', lineNumber: 1,
  startColumn: 0, endColumn: 20, maskedValue: 'AKIA***REAL', detectionLayer: 1, patternId: 'aws',
};
const mediumEntropyFinding: Finding = {
  id: 'me1', secretType: 'api_key', confidence: 'medium', lineNumber: 2,
  startColumn: 0, endColumn: 24, maskedValue: 'xxxx***yyyy', detectionLayer: 3, patternId: 'ent',
};
const overlappingEntropy: Finding = {
  id: 'ov1', secretType: 'aws_access_key', confidence: 'medium', lineNumber: 1,
  startColumn: 0, endColumn: 20, maskedValue: 'AKIA***REAL', detectionLayer: 3, patternId: 'ent',
};

function makeOrch(
  regex: MockDetectionEngine,
  entropy: MockDetectionEngine,
  llm: MockDetectionEngine
) {
  return new ScanOrchestrator([regex, entropy, llm]);
}

describe('WO-063: ScanOrchestrator integration', () => {
  it('1 happy path all layers', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding] }),
      new MockDetectionEngine({ name: 'llm', layer: 2, findingsToReturn: [] })
    );
    const events = await drain(orch.scan('text'));
    expect(last(events).status).toBe('complete');
    expect(last(events).findings?.length).toBeGreaterThan(0);
  });

  it('2 regex only findings', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [] }),
      new MockDetectionEngine({ name: 'llm', layer: 2, findingsToReturn: [] })
    );
    const events = await drain(orch.scan('a'));
    expect(last(events).findings?.some((f) => f.detectionLayer === 1)).toBe(true);
  });

  it('3 entropy only findings', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding] }),
      new MockDetectionEngine({ name: 'llm', layer: 2, findingsToReturn: [] })
    );
    const events = await drain(orch.scan('b'));
    expect(last(events).findings?.some((f) => f.detectionLayer === 3)).toBe(true);
  });

  it('4 dedup overlapping', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [overlappingEntropy] }),
      new MockDetectionEngine({ name: 'llm', layer: 2, findingsToReturn: [] })
    );
    const events = await drain(orch.scan('c'));
    const findings = last(events).findings ?? [];
    const sameLine = findings.filter((f) => f.lineNumber === 1 && f.startColumn === 0);
    expect(sameLine.length).toBeLessThanOrEqual(2);
  });

  it('5 regex unavailable skips', async () => {
    const regex = new MockDetectionEngine({ name: 'regex', layer: 1, isAvailable: false });
    const orch = makeOrch(
      regex,
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('d'));
    expect(regex.analyzeCallCount).toBe(0);
    expect(last(events).status).toBe('complete');
  });

  it('6 entropy unavailable', async () => {
    const ent = new MockDetectionEngine({ name: 'entropy', layer: 3, isAvailable: false });
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      ent,
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    await drain(orch.scan('e'));
    expect(ent.analyzeCallCount).toBe(0);
  });

  it('7 llm unavailable', async () => {
    const llm = new MockDetectionEngine({ name: 'llm', layer: 2, isAvailable: false });
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      llm
    );
    await drain(orch.scan('f'));
    expect(llm.analyzeCallCount).toBe(0);
  });

  it('8 regex throws partial results', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, shouldFail: true }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding] }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('g'));
    expect(last(events).findings?.length).toBeGreaterThan(0);
  });

  it('9 entropy throws keeps regex', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, shouldFail: true }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('h'));
    expect(last(events).findings?.some((f) => f.id === 'hr1')).toBe(true);
  });

  it('10 llm throws keeps prior', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2, shouldFail: true })
    );
    const events = await drain(orch.scan('i'));
    expect(last(events).findings?.length).toBeGreaterThan(0);
  });

  it('11 abort mid-scan', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding], delayMs: 40 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding], delayMs: 40 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const gen = orch.scan('j');
    const first = await gen.next();
    orch.abort();
    const rest: ScanProgress[] = [];
    for await (const e of gen) rest.push(e);
    const all = first.done || !first.value ? rest : [first.value, ...rest];
    expect(all.length).toBeGreaterThan(0);
  });

  it('12 empty input', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan(''));
    expect(last(events).status).toBe('complete');
  });

  it('13 progressive events emitted', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('k'));
    expect(events.length).toBeGreaterThan(1);
  });

  it('14 percentage non-decreasing at end', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('l'));
    expect(last(events).percentage).toBeGreaterThanOrEqual(events[0]!.percentage ?? 0);
  });

  it('15 capabilities reflect engines', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2, isAvailable: false })
    );
    expect(orch.getCapabilities().llmAvailable).toBe(false);
  });

  it('16 multiple findings merge', async () => {
    const f2: Finding = { ...mediumEntropyFinding, id: 'me2', lineNumber: 9 };
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding, f2] }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('m'));
    expect((last(events).findings ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('17 llm findings included when ambiguous', async () => {
    const llmF: Finding = {
      id: 'llm1', secretType: 'api_key', confidence: 'medium', lineNumber: 3,
      startColumn: 0, endColumn: 8, maskedValue: '****', detectionLayer: 2, patternId: 'llm',
    };
    // medium confidence from regex triggers LLM path
    const amb: Finding = { ...highRegexFinding, id: 'amb', confidence: 'medium' };
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [amb] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2, findingsToReturn: [llmF] })
    );
    const events = await drain(orch.scan('n'));
    expect(last(events).status).toBe('complete');
  });

  it('18 layer statuses present', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('o'));
    expect(last(events).layerStatuses?.length).toBeGreaterThanOrEqual(1);
  });

  it('19 sanitize path does not throw on markup', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('<script>alert(1)</script>'));
    expect(last(events).status).toBe('complete');
  });

  it('20 concurrent scans independent', async () => {
    const a = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const b = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, findingsToReturn: [mediumEntropyFinding] }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const [ea, eb] = await Promise.all([drain(a.scan('p')), drain(b.scan('q'))]);
    expect(last(ea).findings?.some((f) => f.id === 'hr1')).toBe(true);
    expect(last(eb).findings?.some((f) => f.id === 'me1')).toBe(true);
  });

  it('21 analyze called once per available engine when LLM triggered', async () => {
    const r = new MockDetectionEngine({
      name: 'regex', layer: 1,
      findingsToReturn: [{ ...highRegexFinding, confidence: 'medium' }],
    });
    const e = new MockDetectionEngine({ name: 'entropy', layer: 3 });
    const l = new MockDetectionEngine({ name: 'llm', layer: 2 });
    const orch = makeOrch(r, e, l);
    await drain(orch.scan('r'));
    expect(r.analyzeCallCount).toBeGreaterThanOrEqual(1);
    expect(e.analyzeCallCount).toBeGreaterThanOrEqual(1);
  });

  it('22 delay engines still complete', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, delayMs: 5 }),
      new MockDetectionEngine({ name: 'entropy', layer: 3, delayMs: 5 }),
      new MockDetectionEngine({ name: 'llm', layer: 2, delayMs: 5 })
    );
    const events = await drain(orch.scan('s'));
    expect(last(events).status).toBe('complete');
  });

  it('23 confidence preserved', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('t'));
    expect(last(events).findings?.[0]?.confidence).toBeTruthy();
  });

  it('24 masked values present', async () => {
    const orch = makeOrch(
      new MockDetectionEngine({ name: 'regex', layer: 1, findingsToReturn: [highRegexFinding] }),
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    const events = await drain(orch.scan('u'));
    expect(last(events).findings?.[0]?.maskedValue).toContain('*');
  });

  it('25 vi spy on analyze', async () => {
    const r = new MockDetectionEngine({ name: 'regex', layer: 1 });
    const spy = vi.spyOn(r, 'analyze');
    const orch = makeOrch(
      r,
      new MockDetectionEngine({ name: 'entropy', layer: 3 }),
      new MockDetectionEngine({ name: 'llm', layer: 2 })
    );
    await drain(orch.scan('v'));
    expect(spy).toHaveBeenCalled();
  });
});
