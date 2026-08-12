import React, { useMemo } from 'react';
import { DetectionLayerName, LayerRunStatus, LayerStatusMap } from '@/types';

export interface LayerProgressProps {
  readonly layerStatuses: LayerStatusMap;
  readonly className?: string;
}

interface LayerConfig {
  readonly key: DetectionLayerName;
  readonly label: string;
  readonly testId: string;
}

const LAYER_CONFIG: readonly LayerConfig[] = [
  { key: 'regex', label: 'Regex', testId: 'layer-progress-regex' },
  { key: 'entropy', label: 'Entropy', testId: 'layer-progress-entropy' },
  { key: 'llm', label: 'LLM', testId: 'layer-progress-llm' },
];

function statusLabel(layer: string, status: LayerRunStatus): string {
  switch (status) {
    case 'complete':
      return `${layer} complete`;
    case 'running':
      return `${layer} in progress`;
    case 'unavailable':
      return `${layer} unavailable`;
    default:
      return `${layer} pending`;
  }
}

const CheckIcon: React.FC = () => (
  <svg
    data-testid="layer-icon-complete"
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

const SpinnerIcon: React.FC = () => (
  <svg
    data-testid="layer-icon-running"
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

const UnavailableIcon: React.FC = () => (
  <svg
    data-testid="layer-icon-unavailable"
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-amber-600 dark:text-amber-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const PendingIcon: React.FC = () => (
  <span
    data-testid="layer-icon-pending"
    className="inline-block w-3 text-center text-surface-light-textSecondary dark:text-surface-dark-textSecondary"
    aria-hidden="true"
  >
    –
  </span>
);

function StatusIcon({ status }: { status: LayerRunStatus }): React.ReactElement {
  switch (status) {
    case 'complete':
      return <CheckIcon />;
    case 'running':
      return <SpinnerIcon />;
    case 'unavailable':
      return <UnavailableIcon />;
    default:
      return <PendingIcon />;
  }
}

/**
 * LayerProgress — horizontal row of detection-layer status indicators with
 * ARIA live announcements when statuses change.
 */
export const LayerProgress: React.FC<LayerProgressProps> = ({
  layerStatuses,
  className = '',
}) => {
  const announcement = useMemo(
    () =>
      LAYER_CONFIG.map((layer) =>
        statusLabel(layer.label, layerStatuses[layer.key])
      ).join('. '),
    [layerStatuses]
  );

  return (
    <div
      data-testid="layer-progress"
      className={`flex flex-wrap items-center gap-3 ${className}`}
    >
      <ul className="flex flex-wrap items-center gap-2" aria-label="Detection layer progress">
        {LAYER_CONFIG.map((layer) => {
          const status = layerStatuses[layer.key];
          return (
            <li
              key={layer.key}
              data-testid={layer.testId}
              data-status={status}
              className={[
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                'border border-surface-light-border dark:border-surface-dark-border',
                'bg-surface-light-bg dark:bg-surface-dark-bg',
                'text-surface-light-textPrimary dark:text-surface-dark-textPrimary',
              ].join(' ')}
            >
              <StatusIcon status={status} />
              <span>{layer.label}</span>
              <span className="sr-only">{statusLabel(layer.label, status)}</span>
            </li>
          );
        })}
      </ul>
      <div
        data-testid="layer-progress-live"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
};
