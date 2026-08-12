import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DownloadProgress,
  ModelLifecycleEvent,
  ModelLifecycleState,
} from '@/types/model-lifecycle';

/** Minimal event emitter contract satisfied by ModelLifecycleManager. */
export interface ModelLifecycleSource {
  readonly subscribe: (listener: (event: ModelLifecycleEvent) => void) => () => void;
  readonly initialize?: (modelId?: string) => Promise<void>;
  readonly getState?: () => ModelLifecycleState;
}

export interface UseModelStatusResult {
  readonly status: ModelLifecycleState;
  readonly progress: DownloadProgress | null;
  readonly error: string | null;
  readonly isLLMAvailable: boolean;
  readonly initializeModel: (modelId?: string) => Promise<void>;
}

const THROTTLE_MS = 100;

/**
 * Subscribes to ModelLifecycleManager events and exposes typed UI state (WO-041).
 */
export function useLifecycleModelStatus(
  source?: ModelLifecycleSource | null
): UseModelStatusResult {
  const [status, setStatus] = useState<ModelLifecycleState>(source?.getState?.() ?? 'idle');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const unsubscribe = source.subscribe((event) => {
      if (cancelled) return;
      const now = Date.now();
      if (event.progress && now - lastUpdateRef.current < THROTTLE_MS) {
        // throttle rapid DOWNLOAD_PROGRESS updates
        setStatus(event.state);
        return;
      }
      lastUpdateRef.current = now;
      setStatus(event.state);
      setProgress(event.progress ?? null);
      setError(event.error ?? null);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [source]);

  const initializeModel = useCallback(
    async (modelId?: string) => {
      if (!source?.initialize) {
        setError('Model lifecycle manager is not configured');
        return;
      }
      try {
        await source.initialize(modelId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Model initialization failed');
        setStatus('error');
      }
    },
    [source]
  );

  return {
    status,
    progress,
    error,
    isLLMAvailable: status === 'ready',
    initializeModel,
  };
}

// Alias matching WO file naming while avoiding clash with StatusBar's useModelStatus.
export { useLifecycleModelStatus as useModelStatusLifecycle };
