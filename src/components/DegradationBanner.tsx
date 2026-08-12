import React, { useState } from 'react';
import { useModelStatus } from '@/hooks';

export interface DegradationBannerProps {
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * DegradationBanner renders a dismissable amber warning banner when the LLM layer
 * is unavailable (WebGPU unsupported, GPU adapter failure, or memory pressure).
 *
 * The banner is session-scoped: once dismissed it remains hidden for the lifetime
 * of the component's mount, consistent with US-009 graceful degradation UX.
 *
 * Layout: Icon + Content + DismissButton (per UI Design Spec — DegradedModePage).
 */
export const DegradationBanner: React.FC<DegradationBannerProps> = ({ className = '' }) => {
  const [dismissed, setDismissed] = useState(false);
  const { llm } = useModelStatus();

  // Only render when LLM is unavailable and user has not dismissed
  if (llm !== 'unavailable' || dismissed) {
    return null;
  }

  return (
    <div
      data-testid="degradation-banner"
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg px-4 py-3 bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 text-amber-900 dark:text-amber-100 transition-colors duration-300 ${className}`}
    >
      {/* Icon */}
      <svg
        data-testid="degradation-banner-icon"
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
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

      {/* Content */}
      <p
        data-testid="degradation-banner-text"
        className="flex-1 text-sm font-medium"
      >
        LLM-based contextual analysis is unavailable. Scanning with regex and entropy detection only.
      </p>

      {/* Dismiss Button */}
      <button
        data-testid="degradation-banner-dismiss"
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss degradation notice"
        className="shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors duration-150"
      >
        <svg
          className="h-4 w-4 text-amber-600 dark:text-amber-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};
