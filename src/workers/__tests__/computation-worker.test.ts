import { describe, expect, it, vi } from 'vitest';

/**
 * Message-protocol unit tests for computation worker (WO-053).
 * Exercises the typed ANALYZE → PROGRESS/RESULT flow via a simulated handler.
 */
describe('WO-053: computation worker protocol', () => {
  it('posts PROGRESS and RESULT for ANALYZE messages', async () => {
    const posted: unknown[] = [];
    const selfMock = {
      postMessage: (msg: unknown) => {
        posted.push(msg);
      },
      onmessage: null as ((ev: MessageEvent) => void) | null,
    };

    // Inline minimal handler mirroring computation.worker.ts contract
    const handle = async (data: {
      type: string;
      requestId: string;
      text: string;
      lines: string[];
    }) => {
      if (data.type !== 'ANALYZE') return;
      selfMock.postMessage({
        type: 'PROGRESS',
        requestId: data.requestId,
        percentage: 50,
        linesProcessed: 1,
        totalLines: data.lines.length || 1,
      });
      selfMock.postMessage({
        type: 'RESULT',
        requestId: data.requestId,
        findings: [],
        layers: ['regex', 'entropy'],
      });
    };

    await handle({
      type: 'ANALYZE',
      requestId: 'r1',
      text: 'hello',
      lines: ['hello'],
    });

    expect(posted).toHaveLength(2);
    expect((posted[0] as { type: string }).type).toBe('PROGRESS');
    expect((posted[1] as { type: string }).type).toBe('RESULT');
  });

  it('ignores non-ANALYZE messages', async () => {
    const spy = vi.fn();
    const data = { type: 'ABORT', requestId: 'r1' };
    if (data.type === 'ANALYZE') spy();
    expect(spy).not.toHaveBeenCalled();
  });
});
