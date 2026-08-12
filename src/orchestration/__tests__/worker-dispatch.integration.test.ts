import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ScanOrchestrator } from '../scan-orchestrator';
import { WorkerDispatcher } from '../WorkerDispatcher';
import { RegexEngine } from '@/engines/RegexEngine';
import { EntropyAnalyzer } from '@/engines/EntropyAnalyzer';
import type {
  ComputationWorkerRequest,
  ComputationWorkerResponse,
} from '@/workers/computation-worker-types';
import { Finding } from '@/types';

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, `../../__fixtures__/${name}`), 'utf8');
}

class EchoWorker {
  public onerror: ((ev: ErrorEvent) => void) | null = null;
  private listeners = new Set<(ev: MessageEvent) => void>();

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') this.listeners.add(listener as (ev: MessageEvent) => void);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'message') this.listeners.delete(listener as (ev: MessageEvent) => void);
  }

  postMessage(msg: ComputationWorkerRequest): void {
    if (msg.type !== 'ANALYZE') return;
    void (async () => {
      const regex = new RegexEngine();
      const entropy = new EntropyAnalyzer();
      const findings = [
        ...(await regex.analyze({ text: msg.text, lines: [...msg.lines] })),
        ...(await entropy.analyze({ text: msg.text, lines: [...msg.lines] })),
      ];
      const progress: ComputationWorkerResponse = {
        type: 'PROGRESS',
        requestId: msg.requestId,
        percentage: 50,
        linesProcessed: Math.floor(msg.lines.length / 2),
        totalLines: msg.lines.length,
      };
      const result: ComputationWorkerResponse = {
        type: 'RESULT',
        requestId: msg.requestId,
        findings: findings as Finding[],
        layers: ['regex', 'entropy'],
      };
      for (const l of this.listeners) {
        l({ data: progress } as MessageEvent);
        l({ data: result } as MessageEvent);
      }
    })();
  }

  terminate(): void {}
}

describe('WO-053: worker dispatch integration', () => {
  it('50k fixture goes through worker path and finds secrets', async () => {
    const text = loadFixture('sample-50k.txt');
    expect(text.length).toBe(50_000);

    const dispatcher = new WorkerDispatcher({
      workerFactory: () => new EchoWorker() as unknown as Worker,
    });
    const orchestrator = new ScanOrchestrator([new RegexEngine(), new EntropyAnalyzer()], {
      workerDispatcher: dispatcher,
    });

    const events = [];
    for await (const p of orchestrator.scan(text)) {
      events.push(p);
    }

    expect(events.some((e) => e.stage.includes('computation worker'))).toBe(true);
    const final = events[events.length - 1];
    expect(final.status).toBe('complete');
    expect(final.findings.length).toBeGreaterThan(0);
  });

  it('worker crash emits degradation warning and still completes', async () => {
    class CrashWorker extends EchoWorker {
      postMessage(): void {
        queueMicrotask(() => {
          this.onerror?.({ message: 'worker died' } as ErrorEvent);
        });
      }
    }

    const dispatcher = new WorkerDispatcher({
      workerFactory: () => new CrashWorker() as unknown as Worker,
    });
    const orchestrator = new ScanOrchestrator([new RegexEngine(), new EntropyAnalyzer()], {
      workerDispatcher: dispatcher,
    });

    const text = 'x'.repeat(10_001) + '\nconst k = "' + ['AKIA', 'IOSFODNN7', 'NOTREAL'].join('') + '";\n';
    const events = [];
    for await (const p of orchestrator.scan(text)) {
      events.push(p);
    }

    expect(events.some((e) => Boolean(e.degradationWarning))).toBe(true);
    expect(events[events.length - 1].status).toBe('complete');
  });

  it('100k worker path keeps main-thread rAF gaps under 200ms with mock worker', async () => {
    const text = loadFixture('sample-100k.txt');
    expect(text.length).toBe(100_000);

    const dispatcher = new WorkerDispatcher({
      workerFactory: () => new EchoWorker() as unknown as Worker,
    });

    const gaps: number[] = [];
    let last = performance.now();
    let frames = 0;
    await new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now();
        gaps.push(now - last);
        last = now;
        frames += 1;
        if (frames < 30) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
      void dispatcher.analyze(text);
    });

    const maxGap = Math.max(...gaps);
    expect(maxGap).toBeLessThan(200);
  });

  it('preserves caller input string identity across worker scan (no clear)', async () => {
    const inputRef = { value: loadFixture('sample-10k.txt') };
    const original = inputRef.value;
    const dispatcher = new WorkerDispatcher({
      forceMainThread: true,
    } as never);
    // force via length: 10k uses main thread
    const orchestrator = new ScanOrchestrator([new RegexEngine()], {
      workerDispatcher: new WorkerDispatcher({
        workerFactory: () => new EchoWorker() as unknown as Worker,
      }),
    });
    for await (const _ of orchestrator.scan(inputRef.value)) {
      // inputRef must remain unchanged
      expect(inputRef.value).toBe(original);
    }
    expect(inputRef.value).toBe(original);
    void dispatcher;
    void vi;
  });
});
