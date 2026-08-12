import { AirGapError, isAirGapError } from '@/errors/airgap-error';
import { ErrorCode } from '@/types/scan';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly code?: ErrorCode | string;
  readonly layer?: string;
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: LogContext;
  readonly error?: {
    readonly name: string;
    readonly code?: string;
    readonly message: string;
    readonly layer?: string;
  };
}

type LogSink = (entry: LogEntry) => void;

const defaultSink: LogSink = (entry) => {
  const payload = JSON.stringify(entry);
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
};

/**
 * Minimal structured Logger (WO-044 interim until WO-047 ships full Logger).
 * Emits JSON-shaped records compatible with the future Logger contract.
 */
export class Logger {
  private static sink: LogSink = defaultSink;

  /** Test-only override for asserting log calls. */
  static setSink(sink: LogSink | null): void {
    Logger.sink = sink ?? defaultSink;
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
    const airgap = isAirGapError(error) ? (error as AirGapError) : undefined;
    const errObj =
      airgap != null
        ? {
            name: airgap.name,
            code: airgap.code,
            message: airgap.message,
            layer: airgap.layer,
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
        code: context?.code ?? airgap?.code,
        layer: context?.layer ?? airgap?.layer,
      },
      errObj
    );
  }

  private static emit(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: LogEntry['error']
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(error ? { error } : {}),
    };
    Logger.sink(entry);
  }
}
