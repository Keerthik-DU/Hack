import { useReducer, useRef, useEffect, useCallback } from 'react';
import { Finding, ScanProgress, ScanState, IScanOrchestrator, ScanCapabilities } from '@/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface ScanEngineState {
  readonly state: ScanState;
  readonly findings: readonly Finding[];
  readonly progress: ScanProgress | null;
  readonly error: string | null;
}

const INITIAL_STATE: ScanEngineState = {
  state: 'idle',
  findings: [],
  progress: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Action union
// ---------------------------------------------------------------------------

type ScanAction =
  | { type: 'SCAN_START' }
  | { type: 'LAYER_COMPLETE'; payload: ScanProgress }
  | { type: 'SCAN_COMPLETE'; payload: ScanProgress }
  | { type: 'SCAN_ERROR'; payload: string }
  | { type: 'SCAN_ABORT' }
  | { type: 'SCAN_RESET' };

// ---------------------------------------------------------------------------
// Reducer — explicit state transition validation
// ---------------------------------------------------------------------------

function scanReducer(state: ScanEngineState, action: ScanAction): ScanEngineState {
  switch (action.type) {
    case 'SCAN_START': {
      if (state.state !== 'idle' && state.state !== 'complete' && state.state !== 'error') {
        // Guard: only allow starting from non-scanning states
        return state;
      }
      return { ...INITIAL_STATE, state: 'scanning' };
    }

    case 'LAYER_COMPLETE': {
      if (state.state !== 'scanning') return state;
      return {
        ...state,
        progress: action.payload,
        findings: action.payload.findings as Finding[],
      };
    }

    case 'SCAN_COMPLETE': {
      if (state.state !== 'scanning') return state;
      return {
        state: 'complete',
        findings: action.payload.findings as Finding[],
        progress: action.payload,
        error: null,
      };
    }

    case 'SCAN_ERROR': {
      if (state.state !== 'scanning') return state;
      return {
        ...state,
        state: 'error',
        error: action.payload,
      };
    }

    case 'SCAN_ABORT': {
      // Preserve partial findings collected before abort
      return {
        state: 'idle',
        findings: state.findings,
        progress: state.progress,
        error: null,
      };
    }

    case 'SCAN_RESET': {
      return { ...INITIAL_STATE };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseScanEngineReturn {
  /** Current state machine status */
  readonly state: ScanState;
  /** Accumulated findings (preserved on abort) */
  readonly findings: readonly Finding[];
  /** Latest ScanProgress event (null when idle/reset) */
  readonly progress: ScanProgress | null;
  /** User-friendly error message (null unless state === 'error') */
  readonly error: string | null;
  /** Trigger a new scan for the given text */
  scan: (text: string) => void;
  /** Abort an active scan (no-op when idle/complete) */
  abort: () => void;
  /** Reset all state back to idle (aborts first if scanning) */
  reset: () => void;
  /** Query orchestrator capability matrix */
  getCapabilities: () => ScanCapabilities;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * useScanEngine bridges the ScanOrchestrator and the React presentation layer.
 *
 * Accepts an IScanOrchestrator via dependency injection for testability.
 * Uses useReducer for deterministic state transitions.
 * Cleans up the active generator on unmount to prevent memory leaks.
 */
export function useScanEngine(orchestrator: IScanOrchestrator): UseScanEngineReturn {
  const [hookState, dispatch] = useReducer(scanReducer, INITIAL_STATE);

  // Refs for generator and abort signal — avoids stale closures
  const generatorRef = useRef<AsyncGenerator<ScanProgress, void, unknown> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // ---------------------------------------------------------------------------
  // Internal abort helper (does not reset findings — preserves partials)
  // ---------------------------------------------------------------------------
  const abortActive = useCallback(() => {
    if (!generatorRef.current) return;
    try {
      orchestrator.abort();
      void generatorRef.current.return(undefined);
    } catch {
      // Silence errors during abort — prevent React unmount warnings
    }
    generatorRef.current = null;
  }, [orchestrator]);

  // ---------------------------------------------------------------------------
  // scan(text)
  // ---------------------------------------------------------------------------
  const scan = useCallback(
    (text: string): void => {
      if (!text || text.trim().length === 0) return;

      // If already scanning, abort first before starting new scan
      if (hookState.state === 'scanning') {
        abortActive();
      }

      dispatch({ type: 'SCAN_START' });

      const runScan = async (): Promise<void> => {
        let generator: AsyncGenerator<ScanProgress, void, unknown>;
        try {
          generator = orchestrator.scan(text);
        } catch (err) {
          if (isMountedRef.current) {
            const msg = err instanceof Error ? err.message : 'Scan initialization failed';
            dispatch({ type: 'SCAN_ERROR', payload: msg });
          }
          return;
        }

        generatorRef.current = generator;
        let lastProgress: ScanProgress | null = null;

        try {
          for await (const progress of generator) {
            if (!isMountedRef.current) break;
            lastProgress = progress;
            dispatch({ type: 'LAYER_COMPLETE', payload: progress });
          }

          // Generator exhausted cleanly — complete
          if (isMountedRef.current && generatorRef.current === generator) {
            if (lastProgress) {
              dispatch({ type: 'SCAN_COMPLETE', payload: lastProgress });
            } else {
              // Zero-yield path: emit synthetic complete progress
              dispatch({
                type: 'SCAN_COMPLETE',
                payload: {
                  status: 'complete',
                  stage: 'Scan complete',
                  percentage: 100,
                  findings: [],
                },
              });
            }
            generatorRef.current = null;
          }
        } catch (err) {
          if (!isMountedRef.current) return;
          if (generatorRef.current !== generator) return; // Already aborted
          const msg = err instanceof Error ? err.message : 'Unknown scan error';
          dispatch({ type: 'SCAN_ERROR', payload: msg });
          generatorRef.current = null;
        }
      };

      void runScan();
    },
    [hookState.state, orchestrator, abortActive]
  );

  // ---------------------------------------------------------------------------
  // abort() — public method, preserves partial findings
  // ---------------------------------------------------------------------------
  const abort = useCallback((): void => {
    if (hookState.state !== 'scanning') return;
    abortActive();
    dispatch({ type: 'SCAN_ABORT' });
  }, [hookState.state, abortActive]);

  // ---------------------------------------------------------------------------
  // reset() — clears all state back to idle
  // ---------------------------------------------------------------------------
  const reset = useCallback((): void => {
    if (hookState.state === 'scanning') {
      abortActive();
    }
    dispatch({ type: 'SCAN_RESET' });
  }, [hookState.state, abortActive]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortActive();
    };
  }, [abortActive]);

  // ---------------------------------------------------------------------------
  // getCapabilities passthrough
  // ---------------------------------------------------------------------------
  const getCapabilities = useCallback(
    (): ScanCapabilities => orchestrator.getCapabilities(),
    [orchestrator]
  );

  return {
    state: hookState.state,
    findings: hookState.findings,
    progress: hookState.progress,
    error: hookState.error,
    scan,
    abort,
    reset,
    getCapabilities,
  };
}
