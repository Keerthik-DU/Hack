/**
 * Scan progress helpers for ResultsPanel progressive loading (WO-029).
 */
import { Finding } from './finding';
import {
  DetectionLayerName,
  LayerRunStatus,
  LayerStatusMap,
  ScanCapabilities,
  ScanProgress,
} from './scan';

/**
 * UI-facing scan progress snapshot consumed by ResultsPanel.
 * Prefer explicit layerStatuses; when omitted, derive via helpers.
 */
export interface ResultsScanProgress {
  readonly status: 'scanning' | 'complete' | 'idle' | 'error' | 'aborted';
  readonly layerStatuses: LayerStatusMap;
  readonly findings: readonly Finding[];
  readonly scanDurationMs: number;
  readonly stage?: string;
  readonly percentage?: number;
}

export const DEFAULT_LAYER_STATUSES: LayerStatusMap = {
  regex: 'pending',
  entropy: 'pending',
  llm: 'pending',
};

export const CONFIDENCE_SORT_PRIORITY: Record<'high' | 'medium' | 'low', number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Stable sort: confidence (high → medium → low), then lineNumber ascending.
 * Equal confidence+lineNumber pairs preserve relative insertion order.
 */
export function sortFindingsByConfidenceThenLine(
  findings: readonly Finding[]
): Finding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const confidenceDelta =
        CONFIDENCE_SORT_PRIORITY[a.finding.confidence] -
        CONFIDENCE_SORT_PRIORITY[b.finding.confidence];
      if (confidenceDelta !== 0) return confidenceDelta;

      const lineDelta = a.finding.lineNumber - b.finding.lineNumber;
      if (lineDelta !== 0) return lineDelta;

      return a.index - b.index;
    })
    .map(({ finding }) => finding);
}

/**
 * Infer layer statuses from orchestrator stage text / current engine when
 * an explicit layerStatuses map is not present on the ScanProgress event.
 */
export function deriveLayerStatuses(
  progress: ScanProgress | null | undefined,
  capabilities?: ScanCapabilities | null
): LayerStatusMap {
  if (progress?.layerStatuses) {
    return progress.layerStatuses;
  }

  const statuses: Record<DetectionLayerName, LayerRunStatus> = {
    regex: 'pending',
    entropy: 'pending',
    llm: capabilities?.llmAvailable === false ? 'unavailable' : 'pending',
  };

  if (!progress) {
    return statuses;
  }

  const stage = (progress.stage ?? '').toLowerCase();
  const engine = (progress.currentEngine ?? '').toLowerCase();
  const percentage = progress.percentage ?? 0;
  const isComplete = progress.status === 'complete';
  const failedLayer = (progress.error?.failedLayer ?? '').toLowerCase();

  if (isComplete) {
    statuses.regex = 'complete';
    statuses.entropy = 'complete';
    if (
      capabilities?.llmAvailable === false ||
      stage.includes('skipped') ||
      stage.includes('unavailable')
    ) {
      statuses.llm = 'unavailable';
    } else {
      statuses.llm = 'complete';
    }
    return statuses;
  }

  if (stage.includes('regex') || engine.includes('regex')) {
    if (stage.includes('complete') || percentage >= 33) {
      statuses.regex = 'complete';
    } else {
      statuses.regex = 'running';
    }
  }

  if (stage.includes('entropy') || engine.includes('entropy')) {
    statuses.regex = 'complete';
    if (stage.includes('complete') || percentage >= 66) {
      statuses.entropy = 'complete';
    } else {
      statuses.entropy = 'running';
    }
  }

  if (
    stage.includes('llm') ||
    engine.includes('llm') ||
    engine.includes('phi') ||
    percentage >= 75
  ) {
    statuses.regex = 'complete';
    statuses.entropy = 'complete';
    if (
      stage.includes('skipped') ||
      stage.includes('unavailable') ||
      capabilities?.llmAvailable === false
    ) {
      statuses.llm = 'unavailable';
    } else if (stage.includes('complete') || percentage >= 90) {
      statuses.llm = 'complete';
    } else {
      statuses.llm = 'running';
    }
  }

  if (failedLayer.includes('regex')) statuses.regex = 'unavailable';
  if (failedLayer.includes('entropy')) statuses.entropy = 'unavailable';
  if (failedLayer.includes('llm')) statuses.llm = 'unavailable';

  // Concurrent regex+entropy completion yields often report percentage 66
  if (percentage >= 66 && statuses.regex === 'pending') statuses.regex = 'complete';
  if (percentage >= 66 && statuses.entropy === 'pending') statuses.entropy = 'complete';

  return statuses;
}

/**
 * Normalize a pipeline ScanProgress into the ResultsPanel view model.
 */
export function toResultsScanProgress(
  progress: ScanProgress | null | undefined,
  capabilities?: ScanCapabilities | null
): ResultsScanProgress {
  return {
    status: progress?.status ?? 'idle',
    layerStatuses: deriveLayerStatuses(progress, capabilities),
    findings: progress?.findings ?? [],
    scanDurationMs: progress?.scanDurationMs ?? 0,
    stage: progress?.stage,
    percentage: progress?.percentage,
  };
}
