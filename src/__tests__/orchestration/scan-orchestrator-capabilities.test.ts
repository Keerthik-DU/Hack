/**
 * WO-043: ScanOrchestrator — capability-based LLM layer skipping tests
 *
 * Verifies that when getCapabilities().llmAvailable is false, the scan pipeline
 * completes successfully using only regex and entropy layers with zero LLM
 * engine invocations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScanOrchestrator } from '../../orchestration/scan-orchestrator';
import { MockDetectionEngine } from '../fixtures/mock-engines';
import { SAMPLE_AWS_FINDING, SAMPLE_ENTROPY_FINDING, SAMPLE_INPUT_MULTI_SECRET } from '../fixtures/sample-inputs';
import { ScanProgress } from '../../types';

describe('WO-043: ScanOrchestrator capability-aware LLM dispatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── getCapabilities() reflects engine availability ───────────────────────

  it('getCapabilities() returns llmAvailable=false when LLM engine isAvailable() returns false', () => {
    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1, isAvailable: true });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3, isAvailable: true });
    const l2 = new MockDetectionEngine({ name: 'LLMAnalyzer', layer: 2, isAvailable: false });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const caps = orchestrator.getCapabilities();

    expect(caps.llmAvailable).toBe(false);
    expect(caps.regexAvailable).toBe(true);
    expect(caps.entropyAvailable).toBe(true);
  });

  it('getCapabilities() returns llmAvailable=true when LLM engine isAvailable() returns true', () => {
    const l2 = new MockDetectionEngine({ name: 'LLMAnalyzer', layer: 2, isAvailable: true });
    const orchestrator = new ScanOrchestrator([l2]);

    expect(orchestrator.getCapabilities().llmAvailable).toBe(true);
  });

  it('getCapabilities() returns llmAvailable=false when no LLM engine is registered', () => {
    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1 });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3 });
    const orchestrator = new ScanOrchestrator([l1, l3]);

    expect(orchestrator.getCapabilities().llmAvailable).toBe(false);
  });

  // ─── LLM skipping when capabilities.llmAvailable is false ────────────────

  it('scan() completes without calling LLM engine analyze() when capabilities.llmAvailable is false', async () => {
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
      isAvailable: false,  // LLM not available
    });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);

    // Confirm capabilities report LLM unavailable
    expect(orchestrator.getCapabilities().llmAvailable).toBe(false);

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    // LLM engine analyze() should never be called
    expect(l2.analyzeCallCount).toBe(0);

    // Regex and entropy were called
    expect(l1.analyzeCallCount).toBe(1);
    expect(l3.analyzeCallCount).toBe(1);
  });

  it('scan() reaches complete status with regex + entropy findings when LLM is unavailable', async () => {
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

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
    expect(finalStep.percentage).toBe(100);
    // Both regex and entropy findings should be present
    expect(finalStep.findings.length).toBeGreaterThan(0);
  });

  it('scan() yields a skipped-stage message when LLM capabilities are unavailable', async () => {
    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1, findingsToReturn: [SAMPLE_AWS_FINDING] });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3 });
    const l2 = new MockDetectionEngine({ name: 'LLMAnalyzer', layer: 2, isAvailable: false });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    const steps: ScanProgress[] = [];

    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    const skippedStep = steps.find((s) => s.stage.includes('skipped'));
    expect(skippedStep).toBeDefined();
    expect(skippedStep?.stage).toContain('LLM');
  });

  it('scan() logs console.info when LLM layer is skipped due to capabilities', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const l1 = new MockDetectionEngine({ name: 'RegexEngine', layer: 1, findingsToReturn: [SAMPLE_AWS_FINDING] });
    const l3 = new MockDetectionEngine({ name: 'EntropyAnalyzer', layer: 3 });
    const l2 = new MockDetectionEngine({ name: 'LLMAnalyzer', layer: 2, isAvailable: false });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('LLM layer skipped')
    );
  });

  // ─── Full capability path still invokes LLM ───────────────────────────────

  it('scan() invokes LLM engine when capabilities.llmAvailable is true', async () => {
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
      isAvailable: true,  // LLM available
    });

    const orchestrator = new ScanOrchestrator([l1, l2, l3]);
    expect(orchestrator.getCapabilities().llmAvailable).toBe(true);

    const steps: ScanProgress[] = [];
    for await (const step of orchestrator.scan(SAMPLE_INPUT_MULTI_SECRET)) {
      steps.push(step);
    }

    // LLM should be called since there are non-high-confidence findings
    expect(l2.analyzeCallCount).toBe(1);

    const finalStep = steps[steps.length - 1];
    expect(finalStep.status).toBe('complete');
  });
});
