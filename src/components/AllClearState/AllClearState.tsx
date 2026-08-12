import React from 'react';
import { CheckIcon } from './CheckIcon';
import { ScanStats } from './ScanStats';
import type { ScanStatsData } from './ScanStats';
import { LayerChecks } from './LayerChecks';
import type { DetectionLayer } from './LayerChecks';
import { useClipboard } from '@/hooks/useClipboard';

export type { ScanStatsData, DetectionLayer };

export interface AllClearStateProps {
  /** The original (unmodified) text that was scanned — passed to Copy Original */
  originalText: string;
  /** Summary statistics from the completed scan */
  scanStats: ScanStatsData;
  /** Detection layers that completed during this scan */
  layersCompleted: DetectionLayer[];
  /** Optional additional CSS class names for the outer container */
  className?: string;
}

/**
 * AllClearState — positive-outcome terminal state rendered when a scan completes
 * with zero findings.
 *
 * Renders a celebratory, confidence-building UI with:
 *  - `CheckIcon`:      animated bounce + rotation on mount
 *  - Title:            letter-spacing reveal animation (motion-safe:animate-title-reveal)
 *  - Description:      fade-up animation (motion-safe:animate-desc-fade-up)
 *  - `ScanStats`:      four stat cards with staggered pop-in
 *  - `LayerChecks`:    per-layer badges with staggered slide-up
 *  - Copy Original:    copies originalText via `useClipboard` hook (WOREF-032)
 *
 * All animations use `motion-safe:` Tailwind prefix to respect
 * `prefers-reduced-motion: reduce`.
 */
export const AllClearState: React.FC<AllClearStateProps> = ({
  originalText,
  scanStats,
  layersCompleted,
  className = '',
}) => {
  const { copy, copied, error } = useClipboard();

  return (
    <div
      data-testid="all-clear-state"
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center gap-6 px-6 py-8 text-center',
        'rounded-xl bg-green-50 dark:bg-green-950',
        'border border-green-200 dark:border-green-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Animated checkmark icon */}
      <CheckIcon />

      {/* Title with letter-spacing reveal animation */}
      <h2
        data-testid="all-clear-title"
        className={[
          'text-2xl font-bold text-green-800 dark:text-green-200',
          'motion-safe:animate-title-reveal',
        ].join(' ')}
      >
        No secrets detected — safe to share
      </h2>

      {/* Description with fade-up animation */}
      <p
        data-testid="all-clear-description"
        className={[
          'text-base text-green-700 dark:text-green-300 max-w-md',
          'motion-safe:animate-desc-fade-up',
        ].join(' ')}
      >
        Your text was scanned across all active detection layers and no secrets or credentials were
        found. It is safe to share.
      </p>

      {/* Scan statistics — four cards with staggered pop-in */}
      <ScanStats scanStats={scanStats} />

      {/* Layer completion indicators — staggered slide-up */}
      <LayerChecks layersCompleted={layersCompleted} />

      {/* Copy Original button and feedback */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button
          type="button"
          data-testid="copy-original-button"
          onClick={() => copy(originalText)}
          className={[
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
            'rounded-md transition-colors duration-150 focus:outline-none',
            'focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
            copied
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-green-600 text-white hover:bg-green-700',
          ].join(' ')}
          aria-live="polite"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            {copied ? (
              /* Checkmark icon when copied */
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            ) : (
              /* Clipboard icon when idle */
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            )}
          </svg>
          <span data-testid="copy-original-button-label">
            {copied ? 'Copied!' : 'Copy Original'}
          </span>
        </button>

        {/* Success toast */}
        {copied && (
          <span
            data-testid="copy-original-toast"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
            role="status"
            aria-live="polite"
          >
            Original text copied to clipboard
          </span>
        )}

        {/* Error feedback */}
        {error && !copied && (
          <span
            data-testid="copy-original-error"
            className="text-sm font-medium text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    </div>
  );
};
