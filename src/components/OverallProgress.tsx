import React from 'react';

export interface OverallProgressProps {
  readonly overallPercent: number;
  readonly elapsedMs: number;
  readonly sublabel?: string;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export const OverallProgress: React.FC<OverallProgressProps> = ({
  overallPercent,
  elapsedMs,
  sublabel,
}) => (
  <div data-testid="overall-progress" className="space-y-2">
    <div className="flex items-center justify-between text-sm font-semibold">
      <span>Scanning...</span>
      <span data-testid="overall-elapsed">{formatElapsed(elapsedMs)}</span>
    </div>
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={overallPercent}
      aria-label="Overall scan progress"
      className="h-2 w-full overflow-hidden rounded bg-surface-light-border dark:bg-surface-dark-border"
    >
      <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${overallPercent}%` }} />
    </div>
    {sublabel ? <p className="text-xs opacity-70">{sublabel}</p> : null}
  </div>
);
