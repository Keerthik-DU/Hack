import { useEffect, useRef, useState } from 'react';
import type { Finding, ScanProgress } from '@/types';
import type { LayerProgressStatus } from '@/orchestration/scan-progress-types';

export interface UseScanProgressState {
  overallPercent: number;
  elapsedMs: number;
  layerStatuses: Record<'regex' | 'entropy' | 'llm', LayerProgressStatus>;
  earlyFindings: Finding[];
  isComplete: boolean;
  error: string | null;
}

const initialLayers = (): Record<'regex' | 'entropy' | 'llm', LayerProgressStatus> => ({
  regex: 'pending',
  entropy: 'pending',
  llm: 'pending',
});

export function useScanProgress(generator: AsyncGenerator<ScanProgress> | null): UseScanProgressState {
  const [overallPercent, setOverallPercent] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [layerStatuses, setLayerStatuses] = useState(initialLayers);
  const [earlyFindings, setEarlyFindings] = useState<Finding[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!generator) return;
    let cancelled = false;
    startRef.current = performance.now();
    const tick = setInterval(() => {
      setElapsedMs(performance.now() - startRef.current);
    }, 1000);

    (async () => {
      try {
        for await (const event of generator) {
          if (cancelled) break;
          setOverallPercent(event.percentage ?? 0);
          if (event.findings?.length) setEarlyFindings([...event.findings]);
          const stage = event.stage?.toLowerCase() ?? '';
          setLayerStatuses((prev) => {
            const next = { ...prev };
            if (stage.includes('regex')) next.regex = stage.includes('fail') ? 'error' : stage.includes('complete') ? 'completed' : 'in_progress';
            if (stage.includes('entropy')) next.entropy = stage.includes('fail') ? 'error' : stage.includes('complete') ? 'completed' : 'in_progress';
            if (stage.includes('llm')) {
              if (stage.includes('skip') || stage.includes('memory')) next.llm = 'skipped';
              else if (stage.includes('fail')) next.llm = 'error';
              else if (stage.includes('complete')) next.llm = 'completed';
              else next.llm = 'in_progress';
            }
            return next;
          });
          if (event.status === 'complete' || event.status === 'error' || event.status === 'aborted') {
            setIsComplete(true);
            if (event.status === 'error') setError(event.error?.message ?? 'Scan error');
          }
        }
        setIsComplete(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsComplete(true);
      } finally {
        clearInterval(tick);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [generator]);

  return { overallPercent, elapsedMs, layerStatuses, earlyFindings, isComplete, error };
}
