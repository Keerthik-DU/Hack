import React, { useMemo } from 'react';
import { DetectionLayerName, LayerStatus } from '@/types';
import { sanitizeErrorMessage } from '@/errors/airgap-error';

export interface LayerStatusListProps {
  readonly layerStatuses: readonly LayerStatus[];
  readonly className?: string;
  readonly onRetryLayer?: (layer: DetectionLayerName) => void;
}

interface LayerConfig {
  readonly key: DetectionLayerName;
  readonly label: string;
  readonly testId: string;
}

const LAYER_CONFIG: readonly LayerConfig[] = [
  { key: 'regex', label: 'Regex', testId: 'layer-status-regex' },
  { key: 'entropy', label: 'Entropy', testId: 'layer-status-entropy' },
  { key: 'llm', label: 'LLM', testId: 'layer-status-llm' },
];

const CheckIcon: React.FC = () => (
  <svg
    data-testid="layer-status-icon-complete"
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ErrorIcon: React.FC = () => (
  <svg
    data-testid="layer-status-icon-error"
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-red-600 dark:text-red-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
      clipRule="evenodd"
    />
  </svg>
);

const SpinnerIcon: React.FC = () => (
  <svg
    data-testid="layer-status-icon-pending"
    className="h-4 w-4 animate-spin text-indigo-500 dark:text-indigo-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

function StatusIcon({ status }: { status: LayerStatus['status'] }): React.ReactElement {
  if (status === 'complete') return <CheckIcon />;
  if (status === 'error') return <ErrorIcon />;
  return <SpinnerIcon />;
}

function resolveStatus(
  list: readonly LayerStatus[],
  layer: DetectionLayerName
): LayerStatus {
  return (
    list.find((entry) => entry.layer === layer) ?? {
      layer,
      status: 'pending',
      findings: [],
    }
  );
}

/**
 * LayerStatusList — horizontal per-layer ok / error / pending indicators (WO-044).
 */
export const LayerStatusList: React.FC<LayerStatusListProps> = ({
  layerStatuses,
  className = '',
  onRetryLayer,
}) => {
  const announcement = useMemo(
    () =>
      LAYER_CONFIG.map((layer) => {
        const entry = resolveStatus(layerStatuses, layer.key);
        if (entry.status === 'complete') return `${layer.label} complete`;
        if (entry.status === 'error') return `${layer.label} failed`;
        return `${layer.label} pending`;
      }).join('. '),
    [layerStatuses]
  );

  return (
    <div
      data-testid="layer-status-list"
      className={`flex flex-wrap items-center gap-3 ${className}`}
    >
      <ul className="flex flex-wrap items-center gap-2" aria-label="Detection layer status">
        {LAYER_CONFIG.map((layer) => {
          const entry = resolveStatus(layerStatuses, layer.key);
          const isError = entry.status === 'error';
          return (
            <li
              key={layer.key}
              data-testid={layer.testId}
              data-status={entry.status}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                'border',
                isError
                  ? 'border-red-400/70 bg-red-50 text-red-800 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200'
                  : entry.status === 'complete'
                    ? 'border-emerald-400/50 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-surface-light-border bg-surface-light-bg text-surface-light-textPrimary dark:border-surface-dark-border dark:bg-surface-dark-bg dark:text-surface-dark-textPrimary',
              ].join(' ')}
              title={entry.error ? sanitizeErrorMessage(entry.error) : undefined}
            >
              <StatusIcon status={entry.status} />
              <span>{layer.label}</span>
              {isError && onRetryLayer ? (
                <button
                  type="button"
                  data-testid={`layer-status-retry-${layer.key}`}
                  onClick={() => onRetryLayer(layer.key)}
                  className="ml-1 underline underline-offset-2 hover:no-underline"
                >
                  Retry
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div
        data-testid="layer-status-list-live"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
};
