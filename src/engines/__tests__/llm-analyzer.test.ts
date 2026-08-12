import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMAnalyzer } from '../llm-analyzer';
import { MockWorker } from '@/test-utils/mock-worker';
import {
  asFindings,
  expectedResultPayload,
  sampleAmbiguousFindings,
} from '@/test-utils/llm-analyzer-fixtures';
import type { EngineInput } from '@/types';

describe('LLMAnalyzer', () => {
  let mockWorker: MockWorker;
  let analyzer: LLMAnalyzer;
  let progressSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWorker = new MockWorker();
    progressSpy = vi.fn();
    analyzer = new LLMAnalyzer({
      workerFactory: () => mockWorker as unknown as Worker,
      onProgress: progressSpy,
      isWebGPUSupported: () => true,
      analyzeTimeoutMs: 50,
    });
  });

  afterEach(() => {
    analyzer.terminate();
    vi.restoreAllMocks();
  });

  function engineInput(findings = sampleAmbiguousFindings): EngineInput {
    return {
      text: 'sample',
      options: { ambiguousFindings: findings },
    };
  }

  it('1) isAvailable() returns false before initialization', () => {
    expect(analyzer.isAvailable()).toBe(false);
    expect(analyzer.getModelStatus()).toBe('idle');
    expect(analyzer.name).toBe('LLM Contextual Analyzer');
    expect(analyzer.layer).toBe(2);
  });

  it('2) initializeModel() sends INIT_MODEL and resolves on MODEL_READY', async () => {
    const initPromise = analyzer.initializeModel('Phi-3.5-mini-instruct-q4f16_1', '1.0.0');
    expect(mockWorker.lastPosted()).toEqual({
      type: 'INIT_MODEL',
      modelId: 'Phi-3.5-mini-instruct-q4f16_1',
    });

    mockWorker.simulateMessage({ type: 'MODEL_PROGRESS', progress: 0.4, text: 'loading' });
    expect(progressSpy).toHaveBeenCalledWith(0.4, 'loading');

    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await expect(initPromise).resolves.toBeUndefined();
    expect(analyzer.getModelStatus()).toBe('ready');
    expect(analyzer.isAvailable()).toBe(true);
  });

  it('3) initializeModel() rejects on ERROR message', async () => {
    const initPromise = analyzer.initializeModel('bad-model');
    mockWorker.simulateMessage({
      type: 'ERROR',
      code: 'MODEL_LOAD_FAILED' as never,
      message: 'failed to load',
    });
    await expect(initPromise).rejects.toThrow('failed to load');
    expect(analyzer.getModelStatus()).toBe('error');
    expect(analyzer.isAvailable()).toBe(false);
  });

  it('4) analyze() sends ANALYZE and resolves with findings on RESULT', async () => {
    const initPromise = analyzer.initializeModel('model-a');
    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await initPromise;

    const analyzePromise = analyzer.analyze(engineInput());
    expect(mockWorker.lastPosted()?.type).toBe('ANALYZE');
    mockWorker.simulateMessage(expectedResultPayload);
    const findings = await analyzePromise;
    expect(findings).toHaveLength(3);
    expect(findings[0]?.confidence).toBe('high');
    expect(findings[1]?.confidence).toBe('low');
  });

  it('5) analyze() returns empty array when worker not ready', async () => {
    const findings = await analyzer.analyze(engineInput());
    expect(findings).toEqual([]);
    expect(mockWorker.postedMessages.some((m) => m.type === 'ANALYZE')).toBe(false);
  });

  it('6) analyze() returns original findings on timeout', async () => {
    const initPromise = analyzer.initializeModel('model-a');
    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await initPromise;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const findings = await analyzer.analyze(engineInput());
    expect(findings).toEqual(asFindings(sampleAmbiguousFindings));
    expect(warnSpy).toHaveBeenCalled();
  });

  it('7) Worker error event sets status to error and isAvailable to false', async () => {
    const initPromise = analyzer.initializeModel('model-a');
    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await initPromise;
    expect(analyzer.isAvailable()).toBe(true);

    mockWorker.simulateError('GPU driver crash');
    expect(analyzer.getModelStatus()).toBe('error');
    expect(analyzer.isAvailable()).toBe(false);
  });

  it('8) terminate() calls worker.terminate()', () => {
    analyzer.terminate();
    expect(mockWorker.terminated).toBe(true);
    expect(analyzer.isAvailable()).toBe(false);
    // safe to call again
    analyzer.terminate();
  });

  it('integration: initialize → ready → analyze → results', async () => {
    const init = analyzer.initializeModel('integration-model');
    mockWorker.simulateMessage({ type: 'MODEL_PROGRESS', progress: 1, text: 'done' });
    mockWorker.simulateMessage({ type: 'MODEL_READY', capabilities: { webgpu: true } });
    await init;

    const analyze = analyzer.analyze(engineInput([sampleAmbiguousFindings[0]!]));
    const analyzeMsg = mockWorker.lastPosted();
    expect(analyzeMsg?.type).toBe('ANALYZE');
    if (analyzeMsg?.type === 'ANALYZE') {
      expect(analyzeMsg.findings).toHaveLength(1);
    }
    mockWorker.simulateMessage({
      type: 'RESULT',
      findings: [expectedResultPayload.findings[0]!],
      analysisResults: [expectedResultPayload.analysisResults[0]!],
    });
    await expect(analyze).resolves.toEqual([expectedResultPayload.findings[0]]);
  });

  it('isAvailable() is false when WebGPU is unsupported even if model ready', async () => {
    const noGpu = new LLMAnalyzer({
      workerFactory: () => mockWorker as unknown as Worker,
      isWebGPUSupported: () => false,
    });
    const init = noGpu.initializeModel('model-a');
    await expect(init).rejects.toThrow(/WebGPU/);
    noGpu.terminate();
  });

  it('analyze() with empty findings returns [] without posting', async () => {
    const initPromise = analyzer.initializeModel('model-a');
    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await initPromise;
    const before = mockWorker.postedMessages.length;
    const findings = await analyzer.analyze({ text: 'x', options: { ambiguousFindings: [] } });
    expect(findings).toEqual([]);
    expect(mockWorker.postedMessages.length).toBe(before);
  });

  it('initializeModel() is idempotent while in-flight', async () => {
    const first = analyzer.initializeModel('model-a');
    const second = analyzer.initializeModel('model-a');
    expect(first).toBe(second);
    mockWorker.simulateMessage({ type: 'MODEL_READY' });
    await first;
    await second;
    const initCount = mockWorker.postedMessages.filter((m) => m.type === 'INIT_MODEL').length;
    expect(initCount).toBe(1);
  });
});
