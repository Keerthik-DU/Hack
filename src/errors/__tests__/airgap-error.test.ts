import { describe, expect, it } from 'vitest';
import {
  createDetectionLayerError,
  isAirGapError,
  sanitizeErrorMessage,
  toAirGapErrorFromUnknown,
} from '../airgap-error';
import { ErrorCode } from '@/types/scan';

describe('WO-044: AirGapError helpers', () => {
  it('creates DetectionLayerError with isAirGapError marker', () => {
    const err = createDetectionLayerError({
      code: ErrorCode.DETECTION_LAYER_FAILED,
      message: 'failed',
      layer: 'llm',
    });
    expect(isAirGapError(err)).toBe(true);
    expect(err.layer).toBe('llm');
  });

  it('normalizes unknown errors and sanitizes paths', () => {
    const normalized = toAirGapErrorFromUnknown(new Error('boom at C:\\Users\\x\\file.ts'), {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'fallback',
      layer: 'regex',
    });
    expect(normalized.layer).toBe('regex');
    expect(sanitizeErrorMessage(normalized)).not.toContain('C:\\Users');
  });
});
