import React from 'react';

export interface InputLimitBarProps {
  readonly currentCount: number;
  readonly maxCount?: number;
  readonly className?: string;
}

function barColor(ratio: number): string {
  if (ratio > 1) {
    return 'bg-red-500 dark:bg-red-400';
  }
  if (ratio >= 0.8) {
    return 'bg-amber-500 dark:bg-amber-400';
  }
  return 'bg-emerald-500 dark:bg-emerald-400';
}

/**
 * Character-limit progress bar (WO-046).
 * Green &lt;80%, amber 80–100% inclusive, red only when over max.
 */
export const InputLimitBar: React.FC<InputLimitBarProps> = ({
  currentCount,
  maxCount = 100_000,
  className = '',
}) => {
  const safeMax = Math.max(1, maxCount);
  const ratio = currentCount / safeMax;
  const percent = Math.min(100, Math.round(ratio * 100));
  const fillWidth = `${Math.min(100, Math.max(0, ratio * 100))}%`;

  return (
    <div data-testid="input-limit-bar" className={`w-full space-y-1 ${className}`}>
      <div className="flex items-baseline justify-between text-xs text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
        <span data-testid="input-limit-label">Input size</span>
        <span data-testid="input-limit-counts">
          {currentCount.toLocaleString()} / {safeMax.toLocaleString()}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={currentCount}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label="Input character limit"
        data-testid="input-limit-progress"
        data-ratio={ratio > 1 ? 'over' : ratio >= 0.8 ? 'near' : 'ok'}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-light-border dark:bg-surface-dark-border"
      >
        <div
          data-testid="input-limit-fill"
          className={`h-full transition-all ${barColor(ratio)}`}
          style={{ width: fillWidth }}
        />
      </div>
      <p className="sr-only" data-testid="input-limit-percent">
        {percent}% of limit
      </p>
    </div>
  );
};
