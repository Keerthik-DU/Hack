import { Finding, SecretType, ConfidenceLevel, DetectionLayer } from '../finding';
import { ScanProgress, ScanCapabilities, ErrorCode } from '../scan';
import { WorkerMessage } from '../worker';
import type { AmbiguousFinding } from '../llm-types';

/**
 * Factory function to create a mock Finding object for testing.
 */
export function createMockFinding(overrides?: Partial<Finding>): Finding {
  return {
    id: 'finding-1',
    secretType: 'api_key' as SecretType,
    lineNumber: 12,
    columnStart: 15,
    columnEnd: 45,
    confidence: 'high' as ConfidenceLevel,
    detectionLayer: 1 as DetectionLayer,
    maskedValue: 'sk_live_************************',
    context: 'const API_KEY = "sk_live_************************";',
    ...overrides,
  };
}

/**
 * Factory function to create a mock AmbiguousFinding with context lines for LLM worker tests.
 */
export function createMockAmbiguousFinding(
  overrides?: Partial<AmbiguousFinding>
): AmbiguousFinding {
  return {
    ...createMockFinding({ confidence: 'medium', detectionLayer: 2 }),
    entropyScore: 4.2,
    candidates: ['api_key', 'generic_secret'],
    contextLines: [
      'const config = {',
      '  API_KEY: "sk_live_************************",',
      '};',
    ],
    ...overrides,
  };
}

/**
 * Factory function to create a mock ScanProgress object for testing.
 */
export function createMockScanProgress(overrides?: Partial<ScanProgress>): ScanProgress {
  return {
    status: 'scanning',
    stage: 'Layer 1 Regex Scan',
    percentage: 33,
    currentEngine: 'RegexEngine',
    findings: [createMockFinding()],
    ...overrides,
  };
}

/**
 * Factory function to create mock ScanCapabilities for testing.
 */
export function createMockScanCapabilities(
  overrides?: Partial<ScanCapabilities>
): ScanCapabilities {
  return {
    regexAvailable: true,
    entropyAvailable: true,
    llmAvailable: false,
    webgpuSupported: false,
    ...overrides,
  };
}

/**
 * Factory function to create mock WorkerMessage objects for testing.
 */
export function createMockWorkerMessage(type: WorkerMessage['type'] = 'RESULT'): WorkerMessage {
  switch (type) {
    case 'INIT_MODEL':
      return { type: 'INIT_MODEL', modelId: 'phi-3-mini-quantized' };
    case 'MODEL_PROGRESS':
      return { type: 'MODEL_PROGRESS', progress: 50, text: 'Downloading model weights...' };
    case 'MODEL_READY':
      return { type: 'MODEL_READY', capabilities: { webgpu: true } };
    case 'ANALYZE':
      return { type: 'ANALYZE', findings: [createMockAmbiguousFinding()] };
    case 'RESULT':
      return {
        type: 'RESULT',
        findings: [createMockFinding()],
        analysisResults: [
          {
            findingId: 'finding-1',
            verdict: 'real_secret',
            confidence: 0.9,
            reasoning: 'Looks like a live API key',
          },
        ],
      };
    case 'ERROR':
      return {
        type: 'ERROR',
        code: ErrorCode.MODEL_LOAD_FAILED,
        message: 'Failed to load model weights.',
      };
  }
}
