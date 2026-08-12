import React from 'react';
import type { DownloadProgress } from '@/types/model-lifecycle';
import type { ModelLifecycleState } from '@/types/model-lifecycle';
import { formatBytes } from '@/utils/format-bytes';
import { calculateEta } from '@/utils/eta-calculator';

export interface ModelProgressBarProps {
  readonly status: ModelLifecycleState;
  readonly progress: DownloadProgress | null;
  readonly elapsedMs?: number;
  readonly className?: string;
}

export const ModelProgressBar: React.FC<ModelProgressBarProps> = ({
  status,
  progress,
  elapsedMs = 0,
  className = '',
}) => {
  const isDownloading = status === 'downloading' && progress != null;
  const isSuccess = status === 'ready';
  const indeterminate =
    !isDownloading &&
    !isSuccess &&
    status !== 'idle' &&
    status !== 'error' &&
    status !== 'degraded';

  const percent = isSuccess ? 100 : progress?.percent ?? 0;
  const eta =
    isDownloading && progress
      ? calculateEta({
          bytesLoaded: progress.bytesLoaded,
          totalBytes: progress.totalBytes,
          elapsedMs,
        })
      : null;

  return (
    <div data-testid="model-progress-bar" className={`w-full ${className}`}>
      <div className="flex justify-between text-sm mb-1">
        <span data-testid="model-progress-percent">
          {indeterminate ? 'Working…' : isSuccess ? 'Model ready' : `${percent}%`}
        </span>
        {isDownloading && progress && (
          <span data-testid="model-progress-bytes">
            {formatBytes(progress.bytesLoaded)} / {formatBytes(progress.totalBytes)}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : percent}
        aria-busy={indeterminate || undefined}
        className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700 overflow-hidden"
      >
        <div
          data-testid="model-progress-fill"
          className={`h-full transition-all duration-300 ${
            indeterminate
              ? 'w-1/3 animate-pulse bg-sky-500'
              : isSuccess
                ? 'bg-emerald-500'
                : 'bg-sky-600'
          }`}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {eta && (
        <p data-testid="model-progress-eta" className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {eta}
        </p>
      )}
    </div>
  );
};
