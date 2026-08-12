import React from 'react';

export type ScenarioTagSeverity = 'error' | 'warning';

export interface ScenarioTagProps {
  readonly label: string;
  readonly severity?: ScenarioTagSeverity;
  readonly className?: string;
}

/**
 * Small scenario badge for ErrorCard variants (WO-046).
 */
export const ScenarioTag: React.FC<ScenarioTagProps> = ({
  label,
  severity = 'error',
  className = '',
}) => {
  const tone =
    severity === 'warning'
      ? 'border-amber-400/70 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-red-400/70 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-100';

  return (
    <span
      data-testid="scenario-tag"
      data-severity={severity}
      className={[
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide',
        tone,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
};
