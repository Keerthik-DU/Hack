import { describe, it, expect } from 'vitest';
import {
  isWorkerMessage,
  isInitModelMessage,
  isModelProgressMessage,
  isModelReadyMessage,
  isAnalyzeMessage,
  isResultMessage,
  isErrorMessage,
} from '../worker';
import { createMockFinding, createMockWorkerMessage } from './fixtures';
import { ErrorCode } from '../scan';

describe('WorkerMessage Type Guards', () => {
  it('correctly identifies valid worker message formats', () => {
    expect(isWorkerMessage(createMockWorkerMessage('INIT_MODEL'))).toBe(true);
    expect(isWorkerMessage(createMockWorkerMessage('RESULT'))).toBe(true);
    expect(isWorkerMessage(null)).toBe(false);
    expect(isWorkerMessage('invalid')).toBe(false);
    expect(isWorkerMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
  });

  it('correctly narrows INIT_MODEL messages', () => {
    const msg = createMockWorkerMessage('INIT_MODEL');
    if (isInitModelMessage(msg)) {
      expect(msg.modelId).toBe('phi-3-mini-quantized');
    } else {
      throw new Error('Expected InitModelMessage');
    }
  });

  it('correctly narrows MODEL_PROGRESS messages', () => {
    const msg = createMockWorkerMessage('MODEL_PROGRESS');
    if (isModelProgressMessage(msg)) {
      expect(msg.progress).toBe(50);
      expect(msg.text).toBe('Downloading model weights...');
    } else {
      throw new Error('Expected ModelProgressMessage');
    }
  });

  it('correctly narrows MODEL_READY messages', () => {
    const msg = createMockWorkerMessage('MODEL_READY');
    if (isModelReadyMessage(msg)) {
      expect(msg.type).toBe('MODEL_READY');
    } else {
      throw new Error('Expected ModelReadyMessage');
    }
  });

  it('correctly narrows ANALYZE messages', () => {
    const msg = createMockWorkerMessage('ANALYZE');
    if (isAnalyzeMessage(msg)) {
      expect(msg.payload.text).toBeDefined();
    } else {
      throw new Error('Expected AnalyzeMessage');
    }
  });

  it('correctly narrows RESULT messages', () => {
    const msg = createMockWorkerMessage('RESULT');
    if (isResultMessage(msg)) {
      expect(msg.findings.length).toBe(1);
    } else {
      throw new Error('Expected ResultMessage');
    }
  });

  it('correctly narrows ERROR messages', () => {
    const msg = createMockWorkerMessage('ERROR');
    if (isErrorMessage(msg)) {
      expect(msg.code).toBe(ErrorCode.MODEL_LOAD_FAILED);
    } else {
      throw new Error('Expected ErrorMessage');
    }
  });
});

describe('Finding Object Integrity', () => {
  it('instantiates valid Finding objects via factory', () => {
    const finding = createMockFinding();
    expect(finding.id).toBeDefined();
    expect(finding.secretType).toBe('api_key');
    expect(finding.maskedValue).toContain('*');
    expect(finding.rawValue).toBeUndefined();
  });
});
