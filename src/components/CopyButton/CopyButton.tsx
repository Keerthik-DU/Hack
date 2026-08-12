import React, { useEffect } from 'react';
import { useClipboard } from '@/hooks/useClipboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CopyButtonProps {
  /** Text to write to the clipboard when clicked */
  text: string;
  /** Button label shown in the idle state; defaults to 'Copy' */
  label?: string;
  /** Optional callback invoked once the copy succeeds (when copied transitions to true) */
  onCopied?: () => void;
  /** Optional additional CSS class names for the outer button element */
  className?: string;
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

/** Clipboard icon — shown in idle state */
const ClipboardIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    data-testid="copy-button-icon-idle"
  >
    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
  </svg>
);

/** Checkmark icon — shown in copied state */
const CheckIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    data-testid="copy-button-icon-copied"
  >
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

/** X / error icon — shown in error state */
const XIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 shrink-0"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
    data-testid="copy-button-icon-error"
  >
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CopyButton — a self-contained copy-to-clipboard trigger that reflects
 * all three clipboard states:
 *
 * - **Idle**   — shows the provided `label` (default: "Copy") with a clipboard icon
 * - **Copied** — shows "Copied!" with a green checkmark icon for 2 seconds
 * - **Error**  — shows "Failed" with a red X icon if the Clipboard API rejects
 *
 * Clipboard logic is delegated to the `useClipboard` hook (WOREF-032).
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  onCopied,
  className = '',
}) => {
  const { copy, copied, error } = useClipboard();

  // Notify the parent when copy succeeds
  useEffect(() => {
    if (copied) {
      onCopied?.();
    }
  }, [copied, onCopied]);

  const isError = error !== null && !copied;

  // Determine visual state
  const buttonClasses = [
    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
    'rounded-md transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    copied
      ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500'
      : isError
        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      data-testid="copy-button"
      onClick={() => { void copy(text); }}
      className={buttonClasses}
      aria-live="polite"
    >
      {copied ? <CheckIcon /> : isError ? <XIcon /> : <ClipboardIcon />}
      <span data-testid="copy-button-label">
        {copied ? 'Copied!' : isError ? 'Failed' : label}
      </span>
    </button>
  );
};
