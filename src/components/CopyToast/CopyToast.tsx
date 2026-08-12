import React, { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CopyToastProps {
  /** Whether the toast is currently visible */
  visible: boolean;
  /** Message to display inside the toast */
  message: string;
  /** Callback invoked when the toast should be dismissed (after 2-second auto-dismiss) */
  onDismiss: () => void;
}

/** Duration in milliseconds before the toast auto-dismisses */
const AUTO_DISMISS_MS = 2000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CopyToast — a fixed-position toast notification that slides up from the
 * bottom of the viewport with a bouncy spring animation to confirm a
 * successful clipboard copy.
 *
 * - Slides in with `animate-slide-up-spring` (defined in globals.css).
 * - Auto-dismisses after 2 seconds by invoking `onDismiss`.
 * - Supports dark mode via Tailwind `dark:` variants.
 * - Uses `transform: translateX(-50%)` centering so it never causes layout
 *   shift (fixed / transform-only animation).
 *
 * WOREF-032: clipboard feedback counterpart to the useClipboard hook.
 */
export const CopyToast: React.FC<CopyToastProps> = ({ visible, message, onDismiss }) => {
  // Auto-dismiss timer — restarts whenever `visible` becomes true
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      data-testid="copy-toast"
      role="status"
      aria-live="polite"
      className={[
        // Positioning — fixed at the bottom center; transform-only movement
        'fixed bottom-6 left-1/2',
        // Spring slide-up animation
        'animate-slide-up-spring',
        // Visual styling
        'z-50 px-5 py-3 rounded-lg shadow-lg',
        'text-sm font-medium',
        // Light mode
        'bg-gray-900 text-white',
        // Dark mode — lighter background for contrast on dark surfaces
        'dark:bg-gray-100 dark:text-gray-900',
      ].join(' ')}
    >
      <span data-testid="copy-toast-message">{message}</span>
    </div>
  );
};
