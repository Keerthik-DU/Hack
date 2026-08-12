import React from 'react';
import type { LayerProgressStatus } from '@/orchestration/scan-progress-types';

export interface LayerProgressCardProps {
  readonly layerName: string;
  readonly status: LayerProgressStatus;
  readonly percentage?: number;
  readonly detail?: string;
}

export const LayerProgressCard = React.memo(function LayerProgressCard({
  layerName,
  status,
  percentage = 0,
  detail,
}: LayerProgressCardProps) {
  return (
    <div
      data-testid={`layer-progress-card-${layerName.toLowerCase()}`}
      data-status={status}
      className="rounded-lg border border-surface-light-border p-3 dark:border-surface-dark-border"
    >
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{layerName}</span>
        <span>{status === 'in_progress' ? `${percentage}%` : status}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status === 'completed' ? 100 : percentage}
        aria-label={`${layerName} progress`}
        className="mt-2 h-1.5 w-full overflow-hidden rounded bg-surface-light-border dark:bg-surface-dark-border"
      >
        <div
          className="h-full bg-indigo-500 transition-all duration-200"
          style={{ width: `${status === 'completed' ? 100 : Math.min(100, percentage)}%` }}
        />
      </div>
      {detail ? <p className="mt-1 text-xs opacity-80">{detail}</p> : null}
    </div>
  );
});
