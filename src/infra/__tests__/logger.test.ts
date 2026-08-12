import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, type LogEntry } from '../logger';
import { createDetectionLayerError } from '@/errors/airgap-error';
import { ErrorCode as ScanErrorCode } from '@/types/scan';
import { ErrorCode, REQUIRED_ERROR_CODES } from '@/infra/ErrorCodes';
import {
  AirGapError,
  DetectionLayerError,
  ModelLifecycleError,
  ScanEngineError,
} from '@/types/errors';
import { ERROR_SCENARIOS, getScenario } from '@/__fixtures__/error-scenarios';

describe('WO-047: Logger', () => {
  const entries: LogEntry[] = [];

  beforeEach(() => {
    entries.length = 0;
    Logger.setSink((entry) => {
      entries.push(entry);
    });
    Logger.setMinLevel('debug');
  });

  afterEach(() => {
    Logger.setSink(null);
    Logger.resetLevelFromEnv();
  });

  it('emits structured error entries with AirGapError metadata (WO-044 compat)', () => {
    const err = createDetectionLayerError({
      code: ScanErrorCode.DETECTION_LAYER_FAILED,
      message: 'layer boom',
      layer: 'entropy',
    });

    Logger.error('engine failed', err, { layer: 'entropy' });

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('error');
    expect(entries[0].message).toBe('engine failed');
    expect(entries[0].error?.code).toBe(ScanErrorCode.DETECTION_LAYER_FAILED);
    expect(entries[0].error?.layer).toBe('entropy');
  });

  it.each(['debug', 'info', 'warn'] as const)('emits %s level with structured fields', (level) => {
    Logger[level]('hello', {
      layer: 'orchestrator',
      operation: 'scan',
      errorCode: null,
      inputSize: 42,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe(level);
    expect(entries[0].message).toBe('hello');
    expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entries[0].layer).toBe('orchestrator');
    expect(entries[0].operation).toBe('scan');
    expect(entries[0].errorCode).toBeNull();
    expect(entries[0].context).toMatchObject({ inputSize: 42 });
  });

  it('logs typed AirGapError with errorCode and layer', () => {
    const err = new DetectionLayerError({
      errorCode: ErrorCode.REGEX_ENGINE_ERROR,
      message: 'bad pattern',
      layer: 'regex',
      operation: 'compile',
    });
    Logger.error('regex failed', err);

    expect(entries[0].error?.code).toBe(ErrorCode.REGEX_ENGINE_ERROR);
    expect(entries[0].errorCode).toBe(ErrorCode.REGEX_ENGINE_ERROR);
    expect(entries[0].layer).toBe('regex');
    expect(entries[0].operation).toBe('compile');
  });

  it('filters below min level (prod-like error-only)', () => {
    Logger.setMinLevel('error');
    Logger.debug('nope');
    Logger.info('nope');
    Logger.warn('nope');
    Logger.error('yes');
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('error');
  });

  it('silent level suppresses all output', () => {
    Logger.setMinLevel('silent');
    Logger.error('hidden');
    expect(entries).toHaveLength(0);
  });

  it('never throws on circular context', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => Logger.info('circular', { layer: 'infra', circular })).not.toThrow();
    expect(entries).toHaveLength(1);
  });

  it('truncates oversized context near 1KB', () => {
    const big = 'x'.repeat(5000);
    Logger.info('big', { layer: 'infra', payload: big });
    const ctx = entries[0].context as Record<string, unknown>;
    const serialized = JSON.stringify(ctx);
    expect(serialized.length).toBeLessThan(2500);
  });

  it('Logger.time records duration via Performance API', () => {
    const stop = Logger.time('unit-op', { layer: 'infra', operation: 'unit-op' });
    stop();
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('timer:unit-op');
    expect(entries[0].context).toHaveProperty('durationMs');
  });

  it('default sink writes JSON to console without throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Logger.setSink(null);
    Logger.setMinLevel('error');
    expect(() => Logger.error('sink test')).not.toThrow();
    expect(spy).toHaveBeenCalled();
    const payload = String(spy.mock.calls[0]?.[0] ?? '');
    expect(payload).toContain('"level":"error"');
    expect(payload).toContain('sink test');
    spy.mockRestore();
  });
});

describe('WO-047: ErrorCode enum', () => {
  it('includes all required codes', () => {
    for (const code of REQUIRED_ERROR_CODES) {
      expect(Object.values(ErrorCode)).toContain(code);
    }
    expect(REQUIRED_ERROR_CODES).toHaveLength(13);
  });
});

describe('WO-047: AirGapError hierarchy', () => {
  it('propagates errorCode, layer, and operation on subclasses', () => {
    const scan = new ScanEngineError({
      errorCode: ErrorCode.SCAN_ABORTED,
      message: 'aborted',
      layer: 'orchestrator',
      operation: 'abort',
    });
    expect(scan).toBeInstanceOf(AirGapError);
    expect(scan.errorCode).toBe(ErrorCode.SCAN_ABORTED);
    expect(scan.code).toBe(ErrorCode.SCAN_ABORTED);
    expect(scan.layer).toBe('orchestrator');
    expect(scan.operation).toBe('abort');

    const model = new ModelLifecycleError({
      errorCode: ErrorCode.MODEL_HASH_MISMATCH,
      message: 'hash',
      operation: 'verify',
    });
    expect(model.layer).toBe('infra');
    expect(model.name).toBe('ModelLifecycleError');

    const layer = new DetectionLayerError({
      errorCode: ErrorCode.ENTROPY_ENGINE_ERROR,
      message: 'entropy',
      layer: 'entropy',
      operation: 'analyze',
    });
    expect(layer.name).toBe('DetectionLayerError');
    expect(layer.layer).toBe('entropy');
  });
});

describe('WO-047: error-scenarios fixtures', () => {
  it('covers every required ErrorCode', () => {
    expect(ERROR_SCENARIOS).toHaveLength(REQUIRED_ERROR_CODES.length);
    for (const code of REQUIRED_ERROR_CODES) {
      const fixture = getScenario(code);
      expect(fixture.error.errorCode).toBe(code);
      expect(fixture.error.message.length).toBeGreaterThan(0);
    }
  });
});
