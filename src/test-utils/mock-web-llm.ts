/**
 * Mock @mlc-ai/web-llm engine for LLM Web Worker unit tests.
 *
 * Configurable success responses, init progress steps, create failures,
 * inference failures, and artificial latency (for timeout tests).
 */

import { vi } from 'vitest';
import type { InitProgressReport, MLCEngineConfig, MLCEngineInterface } from '@mlc-ai/web-llm';
import type { CreateMLCEngineFn } from '@/workers/llm-worker';

export interface MockChatCompletionResponse {
  readonly choices: ReadonlyArray<{
    readonly message: {
      readonly role: 'assistant';
      readonly content: string;
    };
  }>;
}

export interface MockMLCEngineOptions {
  /** Default JSON content returned by chat.completions.create */
  readonly defaultContent?: string;
  /** Per-finding-id JSON content overrides (matched against user prompt findingId) */
  readonly contentByFindingId?: Readonly<Record<string, string>>;
  /** Whether CreateMLCEngine should reject */
  readonly failOnCreate?: boolean;
  /** Error thrown when failOnCreate is true */
  readonly createError?: Error;
  /** Whether chat.completions.create should reject */
  readonly failOnInference?: boolean;
  /** Error thrown when failOnInference is true */
  readonly inferenceError?: Error;
  /** Artificial delay before resolving inference (ms) */
  readonly inferenceDelayMs?: number;
  /** Progress reports emitted during CreateMLCEngine */
  readonly progressSteps?: readonly InitProgressReport[];
}

const DEFAULT_CONTENT = JSON.stringify({
  verdict: 'uncertain',
  confidence: 0.5,
  reasoning: 'Default mock response',
});

/**
 * In-memory stand-in for MLCEngine used by CreateMLCEngine mocks.
 */
export class MockMLCEngine {
  readonly chat: {
    completions: {
      create: ((request: {
        messages?: Array<{ role: string; content: string }>;
      }) => Promise<MockChatCompletionResponse>) & {
        mock: { calls: unknown[][] };
      };
    };
  };

  private readonly options: MockMLCEngineOptions;

  constructor(options: MockMLCEngineOptions = {}) {
    this.options = options;

    const createImpl = async (request: {
      messages?: Array<{ role: string; content: string }>;
    }): Promise<MockChatCompletionResponse> => {
      if (this.options.failOnInference) {
        throw this.options.inferenceError ?? new Error('Mock inference failure');
      }

      if (this.options.inferenceDelayMs && this.options.inferenceDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.options.inferenceDelayMs));
      }

      const userMessage = request.messages?.find((m) => m.role === 'user')?.content ?? '';
      const findingIdMatch = /findingId:\s*(\S+)/.exec(userMessage);
      const findingId = findingIdMatch?.[1];
      const content =
        (findingId && this.options.contentByFindingId?.[findingId]) ||
        this.options.defaultContent ||
        DEFAULT_CONTENT;

      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content,
            },
          },
        ],
      };
    };

    this.chat = {
      completions: {
        create: vi.fn(createImpl) as typeof createImpl & { mock: { calls: unknown[][] } },
      },
    };
  }

  /** Cast helper for injection into createLlmWorkerController */
  asEngine(): MLCEngineInterface {
    return this as unknown as MLCEngineInterface;
  }
}

/**
 * Builds an injectable CreateMLCEngine function backed by MockMLCEngine.
 */
export function createMockCreateMLCEngine(options: MockMLCEngineOptions = {}): {
  createEngine: CreateMLCEngineFn;
  getEngine: () => MockMLCEngine | null;
} {
  let engine: MockMLCEngine | null = null;

  const createEngine: CreateMLCEngineFn = async (
    _modelId: string | string[],
    engineConfig?: MLCEngineConfig
  ) => {
    if (options.failOnCreate) {
      throw options.createError ?? new Error('Mock model load failed');
    }

    const steps = options.progressSteps ?? [
      { progress: 0.25, timeElapsed: 10, text: 'Downloading model weights...' },
      { progress: 0.75, timeElapsed: 40, text: 'Compiling shaders...' },
      { progress: 1, timeElapsed: 80, text: 'Model loaded' },
    ];

    for (const step of steps) {
      engineConfig?.initProgressCallback?.(step);
    }

    engine = new MockMLCEngine(options);
    return engine.asEngine();
  };

  return {
    createEngine,
    getEngine: () => engine,
  };
}
