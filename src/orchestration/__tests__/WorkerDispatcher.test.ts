import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerDispatcher } from '../WorkerDispatcher';
import type {
  ComputationWorkerRequest,
  ComputationWorkerResponse,
} from '@/workers/computation-worker-types';
import { Finding } from '@/types';

class FakeWorker {
  public onerror: ((ev: ErrorEvent) => void) | null = null;
  private listeners = new Set<(ev: MessageEvent) => void>();
  public posted: ComputationWorkerRequest[] = [];
  public terminated = false;

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') this.listeners.add(listener as (ev: MessageEvent) => void);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'message') this.listeners.delete(listener as (ev: MessageEvent) => void);
  }

  postMessage(msg: ComputationWorkerRequest): void {
    this.posted.push(msg);
    if (msg.type !== 'ANALYZE') return;
    queueMicrotask(() => {
      const progress: ComputationWorkerResponse = {
        type: 'PROGRESS',
        requestId: msg.requestId,
        percentage: 50,
        linesProcessed: 1,
        totalLines: 2,
      };
      const result: ComputationWorkerResponse = {
        type: 'RESULT',
        requestId: msg.requestId,
        findings: [
          {
            id: 'f1',
            secretType: 'api_key',
            confidence: 'high',
            lineNumber: 1,
            startColumn: 0,
            endColumn: 10,
            maskedValue: 'AKIA***REAL',
            detectionLayer: 1,
            patternId: 'aws',
          } as Finding,
        ],
        layers: ['regex', 'entropy'],
      };
      for (const l of this.listeners) {
        l({ data: progress } as MessageEvent);
        l({ data: result } as MessageEvent);
      }
    });
  }

  terminate(): void {
    this.terminated = true;
  }

  crash(): void {
    this.onerror?.({ message: 'boom' } as ErrorEvent);
  }
}

describe('WO-053: WorkerDispatcher', () => {
  let lastWorker: FakeWorker | null = null;

  afterEach(() => {
    lastWorker = null;
  });

  it('routes inputs <= 10000 chars to main thread without worker postMessage', async () => {
    const factory = vi.fn(() => {
      lastWorker = new FakeWorker();
      return lastWorker as unknown as Worker;
    });
    const dispatcher = new WorkerDispatcher({
      workerFactory: factory,
      threshold: 10_000,
    });
    const input = 'a'.repeat(10_000);
    const result = await dispatcher.analyze(input);
    expect(result.usedWorker).toBe(false);
    expect(factory).not.toHaveBeenCalled();
    expect(lastWorker).toBeNull();
  });

  it('dispatches inputs > 10000 chars via worker postMessage', async () => {
    const factory = vi.fn(() => {
      lastWorker = new FakeWorker();
      return lastWorker as unknown as Worker;
    });
    const dispatcher = new WorkerDispatcher({
      workerFactory: factory,
      threshold: 10_000,
    });
    const input = 'a'.repeat(10_001);
    const result = await dispatcher.analyze(input);
    expect(factory).toHaveBeenCalled();
    expect(lastWorker?.posted.some((p) => p.type === 'ANALYZE')).toBe(true);
    expect(result.usedWorker).toBe(true);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.progressEvents.length).toBeGreaterThan(0);
  });

  it('falls back to main thread on worker crash', async () => {
    const factory = vi.fn(() => {
      const w = new FakeWorker();
      lastWorker = w;
      // Override postMessage to crash instead of resolving
      w.postMessage = () => {
        queueMicrotask(() => w.crash());
      };
      return w as unknown as Worker;
    });
    const dispatcher = new WorkerDispatcher({
      workerFactory: factory,
      threshold: 10_000,
    });
    const input = ['const x = "', 'AKIA', 'IOSFODNN7', 'NOTREAL', '";'].join('') + '\n' + 'b'.repeat(10_050);
    const result = await dispatcher.analyze(input);
    expect(result.fellBackToMainThread).toBe(true);
    expect(result.usedWorker).toBe(false);
  });

  it('abort rejects in-flight worker work', async () => {
    const factory = vi.fn(() => {
      const w = new FakeWorker();
      lastWorker = w;
      w.postMessage = () => {
        /* never responds */
      };
      return w as unknown as Worker;
    });
    const dispatcher = new WorkerDispatcher({
      workerFactory: factory,
      threshold: 10_000,
    });
    const input = 'c'.repeat(10_001);
    const pending = dispatcher.analyze(input);
    dispatcher.abort();
    await expect(pending).rejects.toBeTruthy();
  });
});
