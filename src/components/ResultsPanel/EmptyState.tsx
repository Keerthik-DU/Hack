import React from 'react';

export interface EmptyStateProps {
  /** True while a scan is actively running with no findings yet */
  readonly scanning?: boolean;
  readonly className?: string;
}

/**
 * EmptyState — placeholder shown while a scan is in progress but no findings
 * have been emitted yet, or when the findings list is empty mid-scan.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  scanning = true,
  className = '',
}) => {
  return (
    <div
      data-testid="results-empty-state"
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center gap-3 text-center',
        'min-h-[220px] rounded-lg px-4 py-8',
        'bg-surface-light-bg dark:bg-surface-dark-bg',
        'border border-dashed border-surface-light-border dark:border-surface-dark-border',
        className,
      ].join(' ')}
    >
      {scanning ? (
        <svg
          data-testid="empty-state-spinner"
          className="h-8 w-8 animate-spin text-indigo-500 dark:text-indigo-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : null}

      <h4
        data-testid="empty-state-title"
        className="text-base font-semibold text-surface-light-textPrimary dark:text-surface-dark-textPrimary"
      >
        {scanning ? 'Scanning for secrets…' : 'No findings yet'}
      </h4>
      <p
        data-testid="empty-state-message"
        className="max-w-sm text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary"
      >
        {scanning
          ? 'Faster detection layers will appear here as soon as they finish. The LLM layer may take longer.'
          : 'Run a scan to analyze pasted text for secrets and credentials.'}
      </p>
    </div>
  );
};
