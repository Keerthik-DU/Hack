import { describe, it, expect, beforeEach } from 'vitest';
import { createLlmWorkerController } from '../llm-worker';
import { ErrorCode } from '@/types/scan';
import type { WorkerMessage } from '@/types/worker-messages';
import { createMockCreateMLCEngine } from '@/test-utils/mock-web-llm';
import {
  ambiguousApiKeyFinding,
  ambiguousFalsePositiveFinding,
  sampleAmbiguousFindings,
} from './fixtures/ambiguous-findings';
import {
  expectedLlmAnalysisResults,
  expectedLlmResponseJsonByFindingId,
  malformedLlmResponses,
} from './fixtures/expected-llm-responses';

function createHarness(options?: Parameters<typeof createMockCreateMLCEngine>[0]) {
  const outbound: WorkerMessage[] = [];
  const mock = createMockCreateMLCEngine({
    contentByFindingId: expectedLlmResponseJsonByFindingId,
    ...options,
  });

  const controller = createLlmWorkerController({
    createEngine: mock.createEngine,
    postMessage: (msg) => outbound.push(msg),
    inferenceTimeoutMs: 200,
  });

  return { controller, outbound, mock };
}

async function send(
  controller: ReturnType<typeof createLlmWorkerController>,
  msg: WorkerMessage
) {
  await controller.onMessage({ data: msg } as MessageEvent<WorkerMessage>);
}

describe('llm-worker message handling', () => {
  beforeEach(() => {
    // Keep real timers for Promise.race timeout tests.
  });

  it('handles INIT_MODEL with MODEL_PROGRESS then MODEL_READY', async () => {
    const { controller, outbound } = createHarness();

    await send(controller, { type: 'INIT_MODEL', modelId: 'Phi-3.5-mini-instruct-q4f16_1-MLC' });

    expect(outbound.some((m) => m.type === 'MODEL_PROGRESS')).toBe(true);
    expect(outbound[outbound.length - 1]).toMatchObject({
      type: 'MODEL_READY',
      capabilities: { webgpu: true, llm: true },
    });
  });

  it('emits MODEL_LOAD_FAILED when engine creation fails', async () => {
    const { controller, outbound } = createHarness({
      failOnCreate: true,
      createError: new Error('Unable to fetch model weights'),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'broken-model' });

    expect(outbound).toHaveLength(1);
    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.MODEL_LOAD_FAILED,
    });
  });

  it('emits WEBGPU_INIT_FAILED when create error mentions WebGPU', async () => {
    const { controller, outbound } = createHarness({
      failOnCreate: true,
      createError: new Error('WebGPU adapter request failed'),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'gpu-model' });

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.WEBGPU_INIT_FAILED,
    });
  });

  it('rejects ANALYZE before INIT_MODEL', async () => {
    const { controller, outbound } = createHarness();

    await send(controller, { type: 'ANALYZE', findings: [ambiguousApiKeyFinding] });

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.WORKER_INITIALIZATION_FAILED,
    });
  });

  it('runs ANALYZE and emits RESULT with upgraded/downgraded findings', async () => {
    const { controller, outbound } = createHarness();

    await send(controller, { type: 'INIT_MODEL', modelId: 'test-model' });
    outbound.length = 0;

    await send(controller, {
      type: 'ANALYZE',
      findings: [ambiguousApiKeyFinding, ambiguousFalsePositiveFinding],
    });

    expect(outbound).toHaveLength(1);
    const result = outbound[0];
    expect(result.type).toBe('RESULT');
    if (result.type !== 'RESULT') return;

    expect(result.analysisResults).toEqual(
      expectedLlmAnalysisResults.filter(
        (r) => r.findingId === 'finding-api-key-1' || r.findingId === 'finding-fp-1'
      )
    );

    const apiFinding = result.findings.find((f) => f.id === 'finding-api-key-1');
    const fpFinding = result.findings.find((f) => f.id === 'finding-fp-1');
    expect(apiFinding?.confidence).toBe('high');
    expect(apiFinding?.detectionLayer).toBe(3);
    expect(fpFinding?.confidence).toBe('low');
    expect(fpFinding?.detectionLayer).toBe(3);
  });

  it('emits INFERENCE_TIMEOUT when completion exceeds timeout', async () => {
    const outbound: WorkerMessage[] = [];
    const controller = createLlmWorkerController({
      createEngine: createMockCreateMLCEngine({
        contentByFindingId: expectedLlmResponseJsonByFindingId,
        inferenceDelayMs: 100,
      }).createEngine,
      postMessage: (msg) => outbound.push(msg),
      inferenceTimeoutMs: 20,
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'test-model' });
    outbound.length = 0;

    await send(controller, {
      type: 'ANALYZE',
      findings: [ambiguousApiKeyFinding],
    });

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.INFERENCE_TIMEOUT,
    });
  });

  it('emits INFERENCE_FAILED when chat completion throws', async () => {
    const { controller, outbound } = createHarness({
      failOnInference: true,
      inferenceError: new Error('VRAM exhaustion'),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'test-model' });
    outbound.length = 0;

    await send(controller, { type: 'ANALYZE', findings: [ambiguousApiKeyFinding] });

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.INFERENCE_FAILED,
    });
  });

  it('emits UNKNOWN_ERROR for unrecognized message types', async () => {
    const { controller, outbound } = createHarness();

    await send(controller, { type: 'RESULT', findings: [], analysisResults: [] });

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.UNKNOWN_ERROR,
    });
  });

  it('maps malformed JSON and unknown verdicts to uncertain', async () => {
    const outbound: WorkerMessage[] = [];
    const { createEngine } = createMockCreateMLCEngine({
      contentByFindingId: {
        'finding-api-key-1': malformedLlmResponses.invalidJson,
        'finding-fp-1': malformedLlmResponses.unknownVerdict,
      },
    });

    const controller = createLlmWorkerController({
      createEngine,
      postMessage: (msg) => outbound.push(msg),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'test-model' });
    outbound.length = 0;

    await send(controller, {
      type: 'ANALYZE',
      findings: [ambiguousApiKeyFinding, ambiguousFalsePositiveFinding],
    });

    const result = outbound[0];
    expect(result.type).toBe('RESULT');
    if (result.type !== 'RESULT') return;

    expect(result.analysisResults[0]?.verdict).toBe('uncertain');
    expect(result.analysisResults[1]?.verdict).toBe('uncertain');
  });

  it('self.onerror handler emits ERROR with UNKNOWN_ERROR', () => {
    const outbound: WorkerMessage[] = [];
    const controller = createLlmWorkerController({
      createEngine: createMockCreateMLCEngine().createEngine,
      postMessage: (msg) => outbound.push(msg),
    });

    controller.onError({
      message: 'Uncaught boom',
      filename: 'llm-worker.ts',
      lineno: 1,
      colno: 1,
    } as ErrorEvent);

    expect(outbound[0]).toMatchObject({
      type: 'ERROR',
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'Uncaught boom',
    });
  });
});

describe('llm-worker integration flow', () => {
  it('validates INIT_MODEL → MODEL_READY → ANALYZE → RESULT with mocked engine', async () => {
    const outbound: WorkerMessage[] = [];
    const { createEngine, getEngine } = createMockCreateMLCEngine({
      contentByFindingId: expectedLlmResponseJsonByFindingId,
    });

    const controller = createLlmWorkerController({
      createEngine,
      postMessage: (msg) => outbound.push(msg),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'integration-model' });

    const progressMessages = outbound.filter((m) => m.type === 'MODEL_PROGRESS');
    expect(progressMessages.length).toBeGreaterThan(0);
    expect(outbound.some((m) => m.type === 'MODEL_READY')).toBe(true);

    outbound.length = 0;
    await send(controller, { type: 'ANALYZE', findings: [...sampleAmbiguousFindings] });

    expect(outbound).toHaveLength(1);
    expect(outbound[0]?.type).toBe('RESULT');
    if (outbound[0]?.type !== 'RESULT') return;

    expect(outbound[0].analysisResults).toEqual(expectedLlmAnalysisResults);
    expect(outbound[0].findings).toHaveLength(sampleAmbiguousFindings.length);
    expect(getEngine()?.chat.completions.create).toHaveBeenCalledTimes(
      sampleAmbiguousFindings.length
    );
  });

  it('processes concurrent ANALYZE messages sequentially', async () => {
    const outbound: WorkerMessage[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const { createEngine } = createMockCreateMLCEngine({
      defaultContent: expectedLlmResponseJsonByFindingId['finding-api-key-1'],
    });

    const wrappedCreate: typeof createEngine = async (modelId, config) => {
      const engine = await createEngine(modelId, config);
      const originalCreate = engine.chat.completions.create.bind(engine.chat.completions);
      engine.chat.completions.create = (async (...args: unknown[]) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        try {
          await new Promise((r) => setTimeout(r, 30));
          return originalCreate(...(args as Parameters<typeof originalCreate>));
        } finally {
          inFlight -= 1;
        }
      }) as typeof engine.chat.completions.create;
      return engine;
    };

    const controller = createLlmWorkerController({
      createEngine: wrappedCreate,
      postMessage: (msg) => outbound.push(msg),
    });

    await send(controller, { type: 'INIT_MODEL', modelId: 'seq-model' });
    outbound.length = 0;

    await Promise.all([
      send(controller, { type: 'ANALYZE', findings: [ambiguousApiKeyFinding] }),
      send(controller, { type: 'ANALYZE', findings: [ambiguousFalsePositiveFinding] }),
    ]);

    expect(maxInFlight).toBe(1);
    expect(outbound.filter((m) => m.type === 'RESULT')).toHaveLength(2);
  });
});
