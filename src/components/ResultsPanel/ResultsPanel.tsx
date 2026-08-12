import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DetectionLayerName,
  Finding,
  LayerStatus,
  ScanCapabilities,
  ScanProgress,
  ScanState,
} from '@/types';
import {
  deriveLayerStatuses,
  getLayerStatusList,
  sortFindingsByConfidenceThenLine,
} from '@/types/scan-progress';
import { AllClearState } from '@/components/AllClearState';
import { RedactedPreview } from '@/components/RedactedPreview';
import { VerdictBanner } from '@/components/VerdictBanner';
import {
  DetectionLayerBoundary,
  LayerStatusList,
  ScanEngineBoundary,
} from '@/components/errors';
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
  /** Full scan reset / retry (used by ScanEngineBoundary). */
  reset?: () => void;
  /** Optional re-scan trigger used after reset. */
  scan?: (text: string) => void;
  /** Retry a single failed detection layer (WO-044). */
  retryLayer?: (layer: DetectionLayerName) => void;
}

export interface ResultsPanelProps {
  /**
   * Scan engine snapshot (typically from useScanEngine).
   * Progressive ScanProgress updates drive LayerProgress / LayerStatusList + findings.
   */
  readonly scanEngine: ResultsPanelScanEngine;
  /** Original pasted text for RedactedPreview / AllClearState */
  readonly originalText?: string;
  readonly className?: string;
}

const LAYER_DETECTION: Record<DetectionLayerName, Finding['detectionLayer']> = {
  regex: 1,
  entropy: 3,
  llm: 2,
};

const LAYER_ORDER: readonly DetectionLayerName[] = ['regex', 'entropy', 'llm'];

function findingsForLayer(
  findings: readonly Finding[],
  layer: DetectionLayerName
): Finding[] {
  const detectionLayer = LAYER_DETECTION[layer];
  return findings.filter((f) => f.detectionLayer === detectionLayer);
}

/**
 * ResultsPanel — primary container orchestrating progressive scan results.
 * Renders LayerStatusList, per-layer DetectionLayerBoundary sections,
 * Findings/Redacted tabs, and empty / all-clear terminal states.
 */
export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  scanEngine,
  originalText = '',
  className = '',
}) => {
  const { state, findings, progress, getCapabilities, reset, scan, retryLayer } =
    scanEngine;
  const [visibleFindings, setVisibleFindings] = useState<Finding[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFindingsRef = useRef<Finding[]>([]);

  const capabilities = useMemo(
    () => getCapabilities?.() ?? null,
    [getCapabilities]
  );

  const layerStatusMap = useMemo(
    () => deriveLayerStatuses(progress, capabilities),
    [progress, capabilities]
  );

  const layerStatusList: LayerStatus[] = useMemo(
    () => getLayerStatusList(progress, capabilities),
    [progress, capabilities]
  );

  const hasLayerError = layerStatusList.some((entry) => entry.status === 'error');
  const allLayersFailed =
    layerStatusList.length > 0 &&
    layerStatusList.every((entry) => entry.status === 'error');

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

  useEffect(() => {
    if (state === 'idle' && findings.length === 0) {
      setVisibleFindings([]);
    }
  }, [state, findings.length]);

  const handleRetryLayer = (layer: DetectionLayerName): void => {
    retryLayer?.(layer);
  };

  const handleRetryScan = (): void => {
    reset?.();
    if (originalText.trim().length > 0 && scan) {
      scan(originalText);
    }
  };

  const isScanning = state === 'scanning';
  const isComplete = state === 'complete';
  const showEmptyWhileScanning = isScanning && visibleFindings.length === 0 && !hasLayerError;
  const showAllClear = isComplete && visibleFindings.length === 0 && !allLayersFailed;

  const scanDurationMs = progress?.scanDurationMs ?? 0;
  const layersCompleted = (
    ['regex', 'entropy', 'llm'] as const
  ).filter((layer) => layerStatusMap[layer] === 'complete');

  const layeredFindingsPanel = (
    <div data-testid="layered-findings" className="flex flex-col gap-4">
      {LAYER_ORDER.map((layer) => {
        const layerFindings = sortFindingsByConfidenceThenLine(
          findingsForLayer(visibleFindings, layer)
        );
        const statusEntry = layerStatusList.find((entry) => entry.layer === layer);
        const showSection =
          layerFindings.length > 0 ||
          statusEntry?.status === 'error' ||
          (isScanning && (statusEntry?.status === 'pending' || statusEntry?.status === 'complete'));

        if (!showSection) {
          return null;
        }

        return (
          <DetectionLayerBoundary
            key={layer}
            layer={layer}
            onRetry={handleRetryLayer}
          >
            <section
              data-testid={`detection-layer-section-${layer}`}
              aria-label={`${layer} detection findings`}
              className="space-y-2"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                {layer === 'regex' ? 'Regex' : layer === 'entropy' ? 'Entropy' : 'LLM'}
              </h4>
              {statusEntry?.status === 'error' && layerFindings.length === 0 ? (
                <div
                  data-testid={`layer-engine-error-${layer}`}
                  className="rounded-md border border-red-400/60 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200"
                >
                  {statusEntry.error?.message ?? `${layer} layer failed`}
                  {retryLayer ? (
                    <button
                      type="button"
                      data-testid={`layer-engine-retry-${layer}`}
                      onClick={() => handleRetryLayer(layer)}
                      className="ml-2 underline underline-offset-2"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : layerFindings.length > 0 ? (
                <FindingsList findings={layerFindings} />
              ) : null}
            </section>
          </DetectionLayerBoundary>
        );
      })}
    </div>
  );

  // Happy path: keep a single globally-sorted FindingsList (WO-029).
  // Partial failure: per-layer sections with DetectionLayerBoundary (WO-044).
  const findingsContent = hasLayerError ? (
    layeredFindingsPanel
  ) : (
    <DetectionLayerBoundary layer="regex" onRetry={handleRetryLayer}>
      <DetectionLayerBoundary layer="entropy" onRetry={handleRetryLayer}>
        <DetectionLayerBoundary layer="llm" onRetry={handleRetryLayer}>
          <FindingsList findings={visibleFindings} />
        </DetectionLayerBoundary>
      </DetectionLayerBoundary>
    </DetectionLayerBoundary>
  );

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
  ) : allLayersFailed ? (
    <div
      data-testid="all-layers-failed"
      className="rounded-lg border border-red-400/50 bg-red-50 px-4 py-6 text-center text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100"
    >
      All detection layers encountered errors. Please retry.
      <div className="mt-3">
        <button
          type="button"
          data-testid="all-layers-retry-scan"
          onClick={handleRetryScan}
          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Retry Scan
        </button>
      </div>
    </div>
  ) : (
    findingsContent
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
    <ScanEngineBoundary
      onRetryScan={handleRetryScan}
      allLayersFailed={allLayersFailed}
    >
      <div
        data-testid="results-panel"
        className={`flex flex-col h-full space-y-4 ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-light-border dark:border-surface-dark-border">
          <h3 className="text-lg font-semibold text-brand-primary">Detection Findings</h3>
          <div className="flex flex-col items-end gap-2">
            {/* LayerProgress retained for WO-029 progressive running/unavailable states */}
            <LayerProgress layerStatuses={layerStatusMap} />
            <LayerStatusList
              layerStatuses={layerStatusList}
              onRetryLayer={retryLayer ? handleRetryLayer : undefined}
            />
          </div>
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
    </ScanEngineBoundary>
  );
};
