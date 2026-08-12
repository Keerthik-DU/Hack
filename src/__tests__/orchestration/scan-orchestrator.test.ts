import { describe, it, expect } from 'vitest';
import { ScanOrchestrator } from '../../orchestration/scan-orchestrator';
import { MockDetectionEngine } from '../fixtures/mock-engines';
import {
  SAMPLE_AWS_FINDING,
  SAMPLE_ENTROPY_FINDING,
  SAMPLE_LLM_FINDING,
  SAMPLE_INPUT_AWS,
  SAMPLE_INPUT_MULTI_SECRET,
  SAMPLE_INPUT_10K,
} from '../fixtures/sample-inputs';
import { ScanProgress } from '../../types';

describe('WO-023: ScanOrchestrator Suite', () => {
  it('implements getCapabilities() correctly returning engine availability matrix', () => {
    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1, isAvailable: true });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3, isAvailable: true });
    const l2 = new MockDetectionEngine({ name: 'LLMAnalyzer', layer: 2, isAvailable: false });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const caps = orchestrator.getCapabilities();

    expect(caps.regexAvailable).toBe(true);
    expect(caps.entropyAvailable).toBe(true);
    expect(caps.llmAvailable).toBe(false);
  });

  it('happy path: yields scan-started, layer-1, layer-3, layer-2, and complete progress events', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [SAMPLE_AWS_FINDING],
    });
    const l3 = new MockDetectionEngine({
      name: 'EntropyAnalyzer',
      layer: 3,
      findingsToReturn: [SAMPLE_ENTROPY_FINDING],
    });
    const l2 = new MockDetectionEngine({
      name: 'LLMAnalyzer',
      layer: 2,
      isAvailable: true,
      findingsToReturn: [SAMPLE_LLM_FINDING],
    });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const steps: ScanProgress[] = [];

    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps[0].status).toBe('scanning');
    expect(steps[0].percentage).toBe(0);

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    expect(finalStep.percentage).toBe(100);
    expect(finalStep.findings.length).toBeGreaterThan(0);
  });

  it('degraded path: skips LLM layer when LLM is unavailable', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [SAMPLE_AWS_FINDING],
    });
    const l3 = new MockDetectionEngine({
      name: 'EntropyAnalyzer',
      layer: 3,
      findingsToReturn: [SAMPLE_ENTROPY_FINDING],
    });
    const l2 = new MockDetectionEngine({
      name: 'LLMAnalyzer',
      layer: 2,
      isAvailable: false,
    });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const steps: ScanProgress[] = [];

    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    expect(l2.analyzeCallCount).toBe(0);
    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
  });

  it('single engine failure: preserves partial results when one layer fails', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      findingsToReturn: [SAMPLE_AWS_FINDING],
    });
    const l3 = new MockDetectionEngine({
      name: 'EntropyAnalyzer',
      layer: 3,
      shouldFail: true,
      errorMessage: 'Entropy worker memory failure',
    });

    const orchestrator = new ScanOrchestrator([l1, l3]);
    const steps: ScanProgress[] = [];

    for await (const step of orchestrator.scan(SAMPLE_INPUT_AWS)) {
      steps.push(step);
    }

    const hasErrorYield = steps.some((s) => s.error !== undefined);
    expect(hasErrorYield).toBe(true);

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    expect(finalStep.findings).toHaveLength(1);
    expect(finalStep.findings[0].id).toBe(SAMPLE_AWS_FINDING.id);
  });

  it('empty input & whitespace input return complete status with 0 findings immediately', async () => {
    const orchestrator = new ScanOrchestrator([]);

    const emptySteps: ScanProgress[] = [];
    for await (const step of orchestrator.scan('   ')) {
      emptySteps.push(step);
    }

    expect(emptySteps).toHaveLength(1);
    expect(emptySteps[0].status).toBe('complete');
    expect(emptySteps[0].findings).toHaveLength(0);
  });

  it('rejects input exceeding 100K characters with error status yield', async () => {
    const orchestrator = new ScanOrchestrator([]);
    const largeInput = 'x'.repeat(100001);

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(largeInput)) {
      steps.push(step);
    }

    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe('error');
    expect(steps[0].error?.message).toContain('exceeds maximum allowed limit');
  });

  it('supports abort() cancellation during execution', async () => {
    const l1 = new MockDetectionEngine({
      name: 'RegexEngine',
      layer: 1,
      delayMs: 100,
      findingsToReturn: [SAMPLE_AWS_FINDING],
    });

    const orchestrator = new ScanOrchestrator([l1]);
    const generator = orchestrator.scan(SAMPLE_INPUT_AWS);

    const step1 = await generator.next();
    expect(step1.value?.percentage).toBe(0);

    orchestrator.abort();

    const step2 = await generator.next();
    expect(step2.done).toBe(false);
    expect(step2.value?.status).toBe('aborted');

    const step3 = await generator.next();
    expect(step3.done).toBe(true);
  });

  it('SLA Performance: completes 10K character input scan in < 2 seconds with stub engines', async () => {
    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1, delayMs: 20 });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3, delayMs: 20 });

    const orchestrator = new ScanOrchestrator([l1, l3]);
    const start = performance.now();

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_10K)) {
      steps.push(step);
    }

    const duration = performance.now() - start;
    console.log(
      `[WO-023 SLA] 10K scan completed in ${duration.toFixed(2)}ms (SLA target < 2000ms)`
    );
    expect(duration).toBeLessThan(2000);
  });
});
