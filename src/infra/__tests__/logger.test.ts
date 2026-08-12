import { afterEach, describe, expect, it } from 'vitest';
import { Logger, LogEntry } from '../logger';
import { createDetectionLayerError } from '@/errors/airgap-error';
import { ErrorCode } from '@/types/scan';

describe('WO-044: Logger', () => {
  afterEach(() => {
    Logger.setSink(null);
  });

  it('emits structured error entries with AirGapError metadata', () => {
    const entries: LogEntry[] = [];
    Logger.setSink((entry) => {
      entries.push(entry);
    });

    const err = createDetectionLayerError({
      code: ErrorCode.DETECTION_LAYER_FAILED,
      message: 'layer boom',
      layer: 'entropy',
    });

    Logger.error('engine failed', err, { layer: 'entropy' });

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('error');
    expect(entries[0].message).toBe('engine failed');
    expect(entries[0].error?.code).toBe(ErrorCode.DETECTION_LAYER_FAILED);
    expect(entries[0].error?.layer).toBe('entropy');
  });
});
