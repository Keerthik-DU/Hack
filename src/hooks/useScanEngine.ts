import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanProgress, ScanCapabilities, ErrorCode } from '@/types';
import { mockScanCapabilities, mockScanProgress } from './__fixtures__/scan-mocks';

export type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';

export interface ScanError {
  code: ErrorCode;
  message: string;
  failedLayer?: string;
}

export interface UseScanEngineReturn {
  triggerScan: (text: string) => Promise<void>;
  abort: () => void;
  status: ScanStatus;
  results: ScanProgress | null;
  error: ScanError | null;
  capabilities: ScanCapabilities;
}

export interface UseScanEngineOptions {
  /** Simulated scan delay in milliseconds (default 300ms for testing) */
  scanDelayMs?: number;
  /** Force simulation of an engine error */
  shouldFail?: boolean;
  /** Custom error object to emit when shouldFail is true */
  simulatedError?: ScanError;
}

/**
 * Custom React hook wrapping the scanning engine state machine and execution pipeline.
 */
export function useScanEngine(options?: UseScanEngineOptions): UseScanEngineReturn {
  const {
    scanDelayMs = 300,
    shouldFail = false,
    simulatedError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'Regex engine encountered an execution error',
      failedLayer: 'Regex Engine (Layer 1)',
    },
  } = options ?? {};

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [results, setResults] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<ScanError | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAbortedRef = useRef<boolean>(false);

  const abort = useCallback(() => {
    isAbortedRef.current = true;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('idle');
    setResults(null);
    setError(null);
  }, []);

  const triggerScan = useCallback(
    async (text: string): Promise<void> => {
      if (!text || text.trim().length === 0) {
        return;
      }

      isAbortedRef.current = false;
      setStatus('scanning');
      setError(null);
      setResults(null);

      return new Promise<void>((resolve) => {
        timeoutRef.current = setTimeout(() => {
          if (isAbortedRef.current) {
            resolve();
            return;
          }

          if (shouldFail) {
            setStatus('error');
            setError(simulatedError);
            setResults(null);
          } else {
            setStatus('complete');
            setError(null);
            setResults({
              ...mockScanProgress,
              percentage: 100,
              stage: 'Scan complete',
            });
          }
          resolve();
        }, scanDelayMs);
      });
    },
    [scanDelayMs, shouldFail, simulatedError]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    triggerScan,
    abort,
    status,
    results,
    error,
    capabilities: mockScanCapabilities,
  };
}
