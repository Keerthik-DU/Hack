import React, { useMemo } from 'react';
import { Finding } from '@/types';
import { redactText } from '@/utils/redaction-mapper';
import { useClipboard } from '@/hooks/useClipboard';

// ---------------------------------------------------------------------------
// Segment model
// ---------------------------------------------------------------------------

/**
 * A plain-text segment from the redacted output (no placeholder).
 */
interface TextSegment {
  type: 'text';
  value: string;
}

/**
 * A redaction placeholder segment such as `[REDACTED-AWS_ACCESS_KEY]`.
 */
interface PlaceholderSegment {
  type: 'placeholder';
  value: string;
}

type RedactedSegment = TextSegment | PlaceholderSegment;

/**
 * Regex that identifies redaction placeholders embedded in the redacted text.
 * Matches strings of the form `[REDACTED-UPPERCASE_OR-HYPHENATED]`.
 */
const PLACEHOLDER_RE = /(\[REDACTED-[A-Z0-9_-]+\])/g;

/**
 * Splits a redacted string into alternating plain-text and placeholder segments
 * for element-by-element rendering without dangerouslySetInnerHTML.
 */
function parseRedactedSegments(text: string): RedactedSegment[] {
  const segments: RedactedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  PLACEHOLDER_RE.lastIndex = 0; // reset before each use (global regex)

  while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'placeholder', value: match[1] });
    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface RedactedPreviewProps {
  /** The full original user-pasted text */
  originalText: string;
  /** Findings produced by the scan pipeline */
  findings: Finding[];
  /** Optional additional CSS class names for the outer container */
  className?: string;
}

/**
 * RedactedPreview renders the original text with every detected secret
 * replaced by a visually highlighted typed placeholder such as
 * `[REDACTED-AWS_ACCESS_KEY]`.
 *
 * - Monospace `<pre>` block preserves code formatting and whitespace.
 * - Placeholders render with amber highlight (no dangerouslySetInnerHTML).
 * - "Copy Redacted Text" button copies the plain-text redacted string to
 *   clipboard using the useClipboard hook (WOREF-032).
 *
 * Acceptance criteria satisfied:
 * AC-1  Typed placeholder format `[REDACTED-{SECRET_TYPE}]`
 * AC-2  Amber highlight background on each placeholder span
 * AC-3  Monospace font, preserving whitespace / line breaks
 * AC-4  Copy button with clipboard copy and success feedback
 */
export const RedactedPreview: React.FC<RedactedPreviewProps> = ({
  originalText,
  findings,
  className = '',
}) => {
  // Compute the fully-redacted plain-text string (memoised for stable references)
  const redactedText = useMemo(
    () => redactText(originalText, findings),
    [originalText, findings]
  );

  // Split the redacted text into renderable segments
  const segments = useMemo(() => parseRedactedSegments(redactedText), [redactedText]);

  const { copy, copied, error } = useClipboard();

  return (
    <div
      data-testid="redacted-preview"
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* ── Redacted text area ── */}
      <pre
        data-testid="redacted-preview-text"
        className={[
          'font-mono text-sm whitespace-pre-wrap break-words leading-relaxed',
          'bg-gray-50 dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700',
          'rounded-md p-4 overflow-auto max-h-[32rem]',
          'text-surface-light-textPrimary dark:text-surface-dark-textPrimary',
        ].join(' ')}
        aria-label="Redacted text preview"
      >
        <code>
          {segments.map((seg, index) =>
            seg.type === 'placeholder' ? (
              <span
                key={index}
                data-testid="redacted-placeholder"
                className={[
                  'bg-amber-200 dark:bg-amber-800',
                  'text-amber-900 dark:text-amber-100',
                  'rounded px-0.5',
                  'font-semibold',
                ].join(' ')}
                aria-label={`Redacted: ${seg.value}`}
              >
                {seg.value}
              </span>
            ) : (
              // Plain text rendered as a string node (no wrapper element needed
              // when it is the only child, but a Fragment avoids the key warning)
              <React.Fragment key={index}>{seg.value}</React.Fragment>
            )
          )}
        </code>
      </pre>

      {/* ── Copy button and feedback ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          data-testid="copy-redacted-button"
          onClick={() => copy(redactedText)}
          className={[
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
            'rounded-md transition-colors duration-150 focus:outline-none',
            'focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
            copied
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
          ].join(' ')}
          aria-live="polite"
        >
          {/* Clipboard icon */}
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
          <span data-testid="copy-button-label">
            {copied ? 'Copied!' : 'Copy Redacted Text'}
          </span>
        </button>

        {/* ── Toast-style success indicator ── */}
        {copied && (
          <span
            data-testid="copy-success-toast"
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
            role="status"
            aria-live="polite"
          >
            Redacted text copied to clipboard
          </span>
        )}

        {/* ── Error feedback ── */}
        {error && !copied && (
          <span
            data-testid="copy-error"
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
