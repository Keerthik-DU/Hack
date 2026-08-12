import { isAirGapError as isStructuralAirGapError } from '@/errors/airgap-error';
import { AirGapError as TypedAirGapError } from '@/types/errors';
import { ErrorCode } from '@/infra/ErrorCodes';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type LogLayer = 'regex' | 'entropy' | 'llm' | 'orchestrator' | 'infra' | string;

export interface LogContext {
  readonly code?: ErrorCode | string;
  readonly layer?: LogLayer;
  readonly operation?: string;
  readonly errorCode?: ErrorCode | string | null;
  readonly [key: string]: unknown;
}

/** Structured log record (WO-047). */
export interface StructuredLogEntry {
  readonly timestamp: string;
  readonly level: Exclude<LogLevel, 'silent'>;
  readonly layer: LogLayer | null;
  readonly operation: string | null;
  readonly errorCode: string | null;
  readonly message: string;
  readonly context: Record<string, unknown>;
}

/** Backward-compatible entry shape used by existing tests/callers. */
export interface LogEntry {
  readonly level: Exclude<LogLevel, 'silent'>;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: LogContext;
  readonly error?: {
    readonly name: string;
    readonly code?: string;
    readonly message: string;
    readonly layer?: string;
  };
  readonly layer?: LogLayer | null;
  readonly operation?: string | null;
  readonly errorCode?: string | null;
}

type LogSink = (entry: LogEntry) => void;

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function resolveConfiguredLevel(): LogLevel {
  const fromEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_LOG_LEVEL) ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.LOG_LEVEL);
  if (
    fromEnv === 'debug' ||
    fromEnv === 'info' ||
    fromEnv === 'warn' ||
    fromEnv === 'error' ||
    fromEnv === 'silent'
  ) {
    return fromEnv;
  }
  const isDev =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
  return isDev ? 'debug' : 'error';
}

function safeSerialize(value: unknown, maxBytes = 1024): Record<string, unknown> {
  try {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return String(v);
      if (typeof v === 'function') return '[Function]';
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) return '[Circular]';
        seen.add(v as object);
      }
      return v;
    });
    if (!json) return {};
    if (json.length <= maxBytes) {
      return JSON.parse(json) as Record<string, unknown>;
    }
    return {
      truncated: true,
      preview: json.slice(0, maxBytes),
    };
  } catch {
    return { serializeError: true };
  }
}

const defaultSink: LogSink = (entry) => {
  try {
    const payload = JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      layer: entry.layer ?? entry.context?.layer ?? null,
      operation: entry.operation ?? entry.context?.operation ?? null,
      errorCode: entry.errorCode ?? entry.context?.errorCode ?? entry.context?.code ?? null,
      message: entry.message,
      context: entry.context ? safeSerialize(entry.context) : {},
      ...(entry.error ? { error: entry.error } : {}),
    });
    switch (entry.level) {
      case 'error':
        console.error(payload);
        break;
      case 'warn':
        console.warn(payload);
        break;
      case 'debug':
        console.debug(payload);
        break;
      default:
        console.info(payload);
    }
  } catch {
    // Logger must never throw
  }
};

/**
 * Structured Logger (WO-047) — console-only, air-gapped, never throws.
 * Backward compatible with WO-044 static helpers.
 */
export class Logger {
  private static sink: LogSink = defaultSink;
  private static minLevel: LogLevel = resolveConfiguredLevel();

  static setSink(sink: LogSink | null): void {
    Logger.sink = sink ?? defaultSink;
  }

  static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  static getMinLevel(): LogLevel {
    return Logger.minLevel;
  }

  static resetLevelFromEnv(): void {
    Logger.minLevel = resolveConfiguredLevel();
  }

  private static shouldEmit(level: Exclude<LogLevel, 'silent'>): boolean {
    if (Logger.minLevel === 'silent') return false;
    return LEVEL_RANK[level] >= LEVEL_RANK[Logger.minLevel];
  }

  static debug(message: string, context?: LogContext): void {
    Logger.emit('debug', message, context);
  }

  static info(message: string, context?: LogContext): void {
    Logger.emit('info', message, context);
  }

  static warn(message: string, context?: LogContext): void {
    Logger.emit('warn', message, context);
  }

  static error(message: string, error?: unknown, context?: LogContext): void {
    const typed = error instanceof TypedAirGapError ? error : undefined;
    const structural = isStructuralAirGapError(error) ? error : undefined;
    const errObj =
      typed != null
        ? {
            name: typed.name,
            code: String(typed.errorCode),
            message: typed.message,
            layer: typed.layer,
          }
        : structural != null
          ? {
              name: structural.name,
              code: structural.code,
              message: structural.message,
              layer: structural.layer,
            }
          : error instanceof Error
            ? { name: error.name, message: error.message }
            : error != null
              ? { name: 'UnknownError', message: String(error) }
              : undefined;

    Logger.emit(
      'error',
      message,
      {
        ...context,
        code: context?.code ?? typed?.errorCode ?? structural?.code,
        errorCode: context?.errorCode ?? typed?.errorCode ?? structural?.code ?? null,
        layer: context?.layer ?? typed?.layer ?? structural?.layer,
        operation: context?.operation ?? typed?.operation,
      },
      errObj
    );
  }

  /**
   * Times an operation with Performance API marks/measures.
   * Returns a stop() function that logs duration in context.
   */
  static time(label: string, context?: LogContext): () => void {
    const startMark = `${label}-start`;
    const endMark = `${label}-end`;
    try {
      if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        performance.mark(startMark);
      }
    } catch {
      // no-op
    }

    return () => {
      let durationMs: number | undefined;
      try {
        if (
          typeof performance !== 'undefined' &&
          typeof performance.mark === 'function' &&
          typeof performance.measure === 'function'
        ) {
          performance.mark(endMark);
          performance.measure(label, startMark, endMark);
          const entries = performance.getEntriesByName(label);
          const last = entries[entries.length - 1];
          durationMs = last?.duration;
        }
      } catch {
        // no-op fallback
      }
      Logger.info(`timer:${label}`, {
        ...context,
        operation: context?.operation ?? label,
        durationMs: durationMs ?? null,
      });
    };
  }

  private static emit(
    level: Exclude<LogLevel, 'silent'>,
    message: string,
    context?: LogContext,
    error?: LogEntry['error']
  ): void {
    try {
      if (!Logger.shouldEmit(level)) return;
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        layer: context?.layer ?? null,
        operation: typeof context?.operation === 'string' ? context.operation : null,
        errorCode:
          (context?.errorCode as string | null | undefined) ??
          (typeof context?.code === 'string' ? context.code : null) ??
          null,
        ...(context ? { context: safeSerialize(context) as LogContext } : {}),
        ...(error ? { error } : {}),
      };
      Logger.sink(entry);
    } catch {
      // swallow
    }
  }
}

// Case-insensitive FS alias: AC path src/infra/Logger.ts
export { Logger as default };
