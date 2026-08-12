import React, { useState } from 'react';

export type ErrorBannerSeverity = 'error' | 'warning';

export interface ErrorBannerProps {
  readonly severity: ErrorBannerSeverity;
  readonly message: string;
  readonly icon?: React.ReactNode;
  readonly className?: string;
  /** Truncation threshold (default 500). */
  readonly maxLength?: number;
}

/**
 * Accessible error/warning banner with optional Show More (WO-046).
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  severity,
  message,
  icon,
  className = '',
  maxLength = 500,
}) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncate = message.length > maxLength;
  const visible =
    needsTruncate && !expanded ? `${message.slice(0, maxLength).trimEnd()}…` : message;

  const tone =
    severity === 'warning'
      ? 'border-amber-400/70 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-50'
      : 'border-red-400/70 bg-red-50 text-red-950 dark:border-red-500/40 dark:bg-red-950/35 dark:text-red-50';

  return (
    <div
      role="alert"
      data-testid="error-banner"
      data-severity={severity}
      className={[
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        tone,
        className,
      ].join(' ')}
    >
      {icon ? (
        <span data-testid="error-banner-icon" className="mt-0.5 shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p data-testid="error-banner-message" className="whitespace-pre-wrap break-words">
          {visible}
        </p>
        {needsTruncate ? (
          <button
            type="button"
            data-testid="error-banner-toggle"
            className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        ) : null}
      </div>
    </div>
  );
};

/** Alias used by Input Too Large / download failure copy in AC. */
export const WarningBanner = ErrorBanner;
