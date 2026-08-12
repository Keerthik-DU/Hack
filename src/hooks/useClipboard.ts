import { useState, useCallback, useRef } from 'react';

/**
 * Return type for the useClipboard hook.
 */
export interface UseClipboardReturn {
  /** Copy text to the system clipboard */
  copy: (text: string) => void;
  /** True for COPIED_RESET_MS after a successful copy; resets automatically */
  copied: boolean;
  /** Error message when copy failed, null otherwise */
  error: string | null;
}

/** Duration in milliseconds that `copied` stays true after a successful copy */
const COPIED_RESET_MS = 2000;

/**
 * useClipboard — wraps the Clipboard API for one-click text copy with
 * transient feedback state.
 *
 * WOREF-032: provides the copy hook consumed by RedactedPreview and similar
 * components that need clipboard integration.
 *
 * Usage:
 * ```tsx
 * const { copy, copied, error } = useClipboard();
 * <button onClick={() => copy(text)}>{copied ? 'Copied!' : 'Copy'}</button>
 * ```
 */
export function useClipboard(): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((text: string): void => {
    // Clear any pending reset timer
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setError(null);

    if (!navigator.clipboard) {
      setError('Clipboard API not available in this environment');
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, COPIED_RESET_MS);
      },
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to copy to clipboard';
        setError(msg);
        setCopied(false);
      }
    );
  }, []);

  return { copy, copied, error };
}
