import type { WorkerMessage } from '@/types/worker-messages';

type MessageHandler = ((ev: MessageEvent<WorkerMessage>) => void) | null;
type ErrorHandler = ((ev: ErrorEvent) => void) | null;

/**
 * Test double for the browser Worker API used by LLMAnalyzer.
 * Captures outbound postMessage calls and lets tests simulate inbound onmessage/onerror.
 */
export class MockWorker {
  public readonly postedMessages: WorkerMessage[] = [];
  public onmessage: MessageHandler = null;
  public onerror: ErrorHandler = null;
  public terminated = false;

  postMessage(message: WorkerMessage): void {
    if (this.terminated) {
      throw new Error('Worker has been terminated');
    }
    this.postedMessages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Simulate an inbound worker message delivered to onmessage. */
  simulateMessage(message: WorkerMessage): void {
    if (this.onmessage) {
      this.onmessage({ data: message } as MessageEvent<WorkerMessage>);
    }
  }

  /** Simulate a worker runtime error delivered to onerror. */
  simulateError(message = 'Mock worker error'): void {
    if (this.onerror) {
      this.onerror({ message, error: new Error(message) } as ErrorEvent);
    }
  }

  /** Most recent outbound message, if any. */
  lastPosted(): WorkerMessage | undefined {
    return this.postedMessages[this.postedMessages.length - 1];
  }
}

export type WorkerFactory = () => Worker;
