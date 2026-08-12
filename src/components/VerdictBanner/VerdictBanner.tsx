import React from 'react';

export interface VerdictBannerProps {
  /** Total number of findings from the completed scan */
  findingsCount: number;
  /** Current scan lifecycle status */
  scanStatus: 'idle' | 'scanning' | 'complete';
  /** Optional additional CSS class names */
  className?: string;
}

type VerdictVariant = 'safe' | 'warning' | 'danger';

function resolveVariant(findingsCount: number): VerdictVariant {
  if (findingsCount === 0) return 'safe';
  if (findingsCount <= 5) return 'warning';
  return 'danger';
}

const VARIANT_STYLES: Record<VerdictVariant, string> = {
  safe: 'bg-green-50 dark:bg-green-950 border-l-4 border-green-500 text-green-900 dark:text-green-100',
  warning:
    'bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 text-amber-900 dark:text-amber-100',
  danger: 'bg-red-50 dark:bg-red-950 border-l-4 border-red-500 text-red-900 dark:text-red-100',
};

const VARIANT_ICON: Record<VerdictVariant, React.ReactElement> = {
  safe: (
    <svg
      data-testid="verdict-icon-safe"
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
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
  ),
  warning: (
    <svg
      data-testid="verdict-icon-warning"
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
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
  ),
  danger: (
    <svg
      data-testid="verdict-icon-danger"
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/**
 * VerdictBanner — displays the overall scan outcome prominently at the top of
 * the results area. Renders nothing when the scan has not yet completed.
 *
 * - Green / checkmark  → scan complete, zero findings
 * - Amber / warning    → scan complete, 1–5 findings
 * - Red   / alert      → scan complete, 6+ findings
 */
export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  findingsCount,
  scanStatus,
  className = '',
}) => {
  // Do not render a verdict while idle or still scanning
  if (scanStatus === 'idle') {
    return null;
  }

  if (scanStatus === 'scanning') {
    return (
      <div
        data-testid="verdict-banner-scanning"
        aria-live="polite"
        className={`flex items-center gap-3 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-900 border-l-4 border-gray-400 text-gray-700 dark:text-gray-300 transition-colors duration-300 ${className}`}
      >
        <svg
          data-testid="verdict-icon-scanning"
          className="h-5 w-5 shrink-0 animate-spin text-gray-500 dark:text-gray-400"
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
        <span className="text-sm font-medium">Scanning…</span>
      </div>
    );
  }

  // scanStatus === 'complete'
  const variant = resolveVariant(findingsCount);
  const variantStyles = VARIANT_STYLES[variant];
  const icon = VARIANT_ICON[variant];

  const verdictText =
    findingsCount === 0
      ? 'No secrets detected — safe to share'
      : `${findingsCount} potential secret${findingsCount === 1 ? '' : 's'} found — review before sharing`;

  return (
    <div
      data-testid="verdict-banner"
      role="alert"
      className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-300 ${variantStyles} ${className}`}
    >
      {icon}
      <span data-testid="verdict-text" className="text-sm font-semibold">
        {verdictText}
      </span>
    </div>
  );
};
