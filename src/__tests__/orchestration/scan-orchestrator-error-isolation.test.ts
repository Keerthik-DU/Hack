import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanOrchestrator } from '@/orchestration/scan-orchestrator';
import {
  createCrashingLlmEngine,
  createThrowingDetectionEngine,
  MockDetectionEngine,
} from '@/__fixtures__/mock-engines';
import { Logger } from '@/infra/logger';
import { ErrorCode, Finding, LayerStatus, ScanProgress } from '@/types';
import {
  SAMPLE_AWS_FINDING,
  SAMPLE_ENTROPY_FINDING,
  SAMPLE_INPUT_AWS,
  SAMPLE_INPUT_MULTI_SECRET,
} from '../fixtures/sample-inputs';

const mediumEntropy: Finding = {
  ...SAMPLE_ENTROPY_FINDING,
  confidence: 'medium',
};

describe('WO-044: ScanOrchestrator error isolation', () => {
  const logEntries: unknown[] = [];

  beforeEach(() => {
    logEntries.length = 0;
    Logger.setSink((entry) => {
      logEntries.push(entry);
    });
  });

  afterEach(() => {
    Logger.setSink(null);
  });

  it('continues after a single engine throws and yields partial findings', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [SAMPLE_AWS_FINDING],
    });
    const l3 = createThrowingDetectionEngine(3, 'Entropy worker memory failure');
    const l2 = new MockDetectionEngine({
      name: 'LLMAnalyzer',
      layer: 2,
      isAvailable: true,
      findingsToReturn: [],
    });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    expect(finalStep.findings.some((f) => f.id === SAMPLE_AWS_FINDING.id)).toBe(true);

    const statuses = finalStep.layerStatuses as LayerStatus[];
    expect(Array.isArray(statuses)).toBe(true);
    expect(statuses.find((s) => s.layer === 'regex')?.status).toBe('complete');
    expect(statuses.find((s) => s.layer === 'entropy')?.status).toBe('error');
    expect(logEntries.some((e) => (e as { level: string }).level === 'error')).toBe(true);
  });

  it('completes gracefully when engines throw', async () => {
    const l1 = createThrowingDetectionEngine(1, 'Regex failed');
    const l3 = createThrowingDetectionEngine(3, 'Entropy failed');
    const l2 = createCrashingLlmEngine('LLM failed');

    const orchestrator = new ScanOrchestrator([l1, l3, l2]);
    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_AWS)) {
      steps.push(step);
    }

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    const statuses = finalStep.layerStatuses as LayerStatus[];
    expect(statuses.find((s) => s.layer === 'regex')?.status).toBe('error');
    expect(statuses.find((s) => s.layer === 'entropy')?.status).toBe('error');

    const regexOk = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [mediumEntropy],
    });
    const orchestrator2 = new ScanOrchestrator([
      regexOk,
      createThrowingDetectionEngine(3, 'Entropy failed'),
      createCrashingLlmEngine(),
    ]);
    const steps2: ScanProgress[] = [];
    for await (const step of orchestrator2.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps2.push(step);
    }
    const final2 = steps2[steps2.length - 1];
    const statuses2 = final2.layerStatuses as LayerStatus[];
    expect(statuses2.find((s) => s.layer === 'llm')?.status).toBe('error');
    expect(final2.findings.some((f) => f.id === mediumEntropy.id)).toBe(true);
  });

  it('marks a hanging engine as error after timeout', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      hangForever: true,
    });
    const l3 = new MockDetectionEngine({
      name: 'EntropyAnalyzer',
      layer: 3,
      findingsToReturn: [SAMPLE_ENTROPY_FINDING],
    });

    const orchestrator = new ScanOrchestrator([l1, l3], {
      regexTimeoutMs: 40,
      entropyTimeoutMs: 200,
    });

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_AWS)) {
      steps.push(step);
    }

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    const statuses = finalStep.layerStatuses as LayerStatus[];
    const regexStatus = statuses.find((s) => s.layer === 'regex');
    expect(regexStatus?.status).toBe('error');
    expect(regexStatus?.error?.code).toBe(ErrorCode.ANALYSIS_TIMEOUT);
    expect(statuses.find((s) => s.layer === 'entropy')?.status).toBe('complete');
  });

  it('isolates LLM worker crash while regex and entropy results remain', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [SAMPLE_AWS_FINDING, mediumEntropy],
    });
    const l3 = new MockDetectionEngine({
      name: 'EntropyAnalyzer',
      layer: 3,
      findingsToReturn: [SAMPLE_ENTROPY_FINDING],
    });
    const l2 = createCrashingLlmEngine('LLM worker crashed');

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    const finalStep = steps[steps.length - 1];
    expect(finalStep.findings.some((f) => f.id === SAMPLE_AWS_FINDING.id)).toBe(true);
    const statuses = finalStep.layerStatuses as LayerStatus[];
    expect(statuses.find((s) => s.layer === 'regex')?.status).toBe('complete');
    expect(statuses.find((s) => s.layer === 'entropy')?.status).toBe('complete');
    expect(statuses.find((s) => s.layer === 'llm')?.status).toBe('error');
    expect(statuses.find((s) => s.layer === 'llm')?.error?.code).toBe(
      ErrorCode.DETECTION_LAYER_FAILED
    );
  });
});
