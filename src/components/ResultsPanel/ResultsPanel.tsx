import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Finding, ScanCapabilities, ScanProgress, ScanState } from '@/types';
import {
  deriveLayerStatuses,
  sortFindingsByConfidenceThenLine,
} from '@/types/scan-progress';
import { AllClearState } from '@/components/AllClearState';
import { RedactedPreview } from '@/components/RedactedPreview';
import { VerdictBanner } from '@/components/VerdictBanner';
import { EmptyState } from './EmptyState';
import { FindingsList } from './FindingsList';
import { LayerProgress } from './LayerProgress';
import { ResultsTabs } from './ResultsTabs';

export interface ResultsPanelScanEngine {
  readonly state: ScanState;
  readonly findings: readonly Finding[];
  readonly progress: ScanProgress | null;
  readonly error: string | null;
  getCapabilities?: () => ScanCapabilities;
}

export interface ResultsPanelProps {
  /**
   * Scan engine snapshot (typically from useScanEngine).
   * Progressive ScanProgress updates drive LayerProgress + findings.
   */
  readonly scanEngine: ResultsPanelScanEngine;
  /** Original pasted text for RedactedPreview / AllClearState */
  readonly originalText?: string;
  readonly className?: string;
}

/**
 * ResultsPanel — primary container orchestrating progressive scan results.
 * Renders LayerProgress, Findings/Redacted tabs, sorted FindingCards, and
 * empty / all-clear terminal states.
 */
export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  scanEngine,
  originalText = '',
  className = '',
}) => {
  const { state, findings, progress, getCapabilities } = scanEngine;
  const [visibleFindings, setVisibleFindings] = useState<Finding[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFindingsRef = useRef<Finding[]>([]);

  const capabilities = useMemo(
    () => getCapabilities?.() ?? null,
    [getCapabilities]
  );

  const layerStatuses = useMemo(
    () => deriveLayerStatuses(progress, capabilities),
    [progress, capabilities]
  );

  // Progressive loading: flush new findings into the list within 500ms of receipt
  useEffect(() => {
    pendingFindingsRef.current = [...findings];

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }

    flushTimerRef.current = setTimeout(() => {
      setVisibleFindings(sortFindingsByConfidenceThenLine(pendingFindingsRef.current));
      flushTimerRef.current = null;
    }, 0);

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [findings]);

  // Reset accumulator when returning to idle with no findings
  useEffect(() => {
    if (state === 'idle' && findings.length === 0) {
      setVisibleFindings([]);
    }
  }, [state, findings.length]);

  const isScanning = state === 'scanning';
  const isComplete = state === 'complete';
  const showEmptyWhileScanning = isScanning && visibleFindings.length === 0;
  const showAllClear = isComplete && visibleFindings.length === 0;

  const scanDurationMs = progress?.scanDurationMs ?? 0;
  const layersCompleted = (
    ['regex', 'entropy', 'llm'] as const
  ).filter((layer) => layerStatuses[layer] === 'complete');

  const findingsPanel = showEmptyWhileScanning ? (
    <EmptyState scanning />
  ) : showAllClear ? (
    <AllClearState
      originalText={originalText}
      scanStats={{
        findingsCount: 0,
        charactersScanned: originalText.length,
        linesScanned: originalText.length === 0 ? 0 : originalText.split('\n').length,
        scanDurationMs,
      }}
      layersCompleted={[...layersCompleted]}
    />
  ) : (
    <FindingsList findings={visibleFindings} />
  );

  const redactedPanel =
    originalText.length > 0 ? (
      <RedactedPreview originalText={originalText} findings={[...visibleFindings]} />
    ) : (
      <div
        data-testid="redacted-preview-unavailable"
        className="rounded-lg border border-dashed border-surface-light-border dark:border-surface-dark-border px-4 py-8 text-center text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary"
      >
        Paste text and run a scan to preview redacted output.
      </div>
    );

  const bannerStatus: 'idle' | 'scanning' | 'complete' =
    state === 'scanning' ? 'scanning' : state === 'complete' ? 'complete' : 'idle';

  return (
    <div
      data-testid="results-panel"
      className={`flex flex-col h-full space-y-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-light-border dark:border-surface-dark-border">
        <h3 className="text-lg font-semibold text-brand-primary">Detection Findings</h3>
        <LayerProgress layerStatuses={layerStatuses} />
      </div>

      {(isScanning || isComplete) && (
        <VerdictBanner findingsCount={visibleFindings.length} scanStatus={bannerStatus} />
      )}

      {state === 'idle' && visibleFindings.length === 0 ? (
        <EmptyState scanning={false} />
      ) : (
        <ResultsTabs findingsPanel={findingsPanel} redactedPanel={redactedPanel} />
      )}
    </div>
  );
};
