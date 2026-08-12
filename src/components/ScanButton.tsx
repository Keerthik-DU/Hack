import React, { useMemo } from 'react';
import { useScanEngine } from '@/hooks';
import { MockScanOrchestrator, MOCK_PROGRESS_EVENTS } from '@/test/fixtures/mock-scan-orchestrator';
import { IScanOrchestrator, ScanProgress } from '@/types';

export interface ScanButtonProps {
  /** Source input text to be scanned */
  inputText?: string;
  /** Optional callback fired when scan starts */
  onScanTriggered?: (text: string) => void;
  /** Custom CSS class overrides */
  className?: string;
  /**
   * Optional scan orchestrator instance (dependency injection for testing).
   * Defaults to a mock orchestrator when not provided.
   */
  orchestrator?: IScanOrchestrator;
}

// Synthetic error progress event for internal error simulation
const ERROR_PROGRESS: ScanProgress = {
  status: 'error',
  stage: 'Error',
  percentage: 0,
  findings: [],
};
void ERROR_PROGRESS;

export const ScanButton: React.FC<ScanButtonProps> = ({
  inputText = '',
  onScanTriggered,
  className = '',
  orchestrator,
}) => {
  // Use provided orchestrator or fall back to a default mock orchestrator
  const defaultOrchestrator = useMemo(
    () => new MockScanOrchestrator({ events: MOCK_PROGRESS_EVENTS }),
    []
  );
  const activeOrchestrator = orchestrator ?? defaultOrchestrator;

  const { scan, state, error } = useScanEngine(activeOrchestrator);

  const isInputEmpty = !inputText || inputText.trim().length === 0;
  const isScanning = state === 'scanning';

  const handleClick = () => {
    if (isInputEmpty || isScanning) {
      return;
    }

    onScanTriggered?.(inputText);
    scan(inputText);
  };

  // Button text & state resolution
  let buttonLabel = 'Scan';
  if (state === 'scanning') {
    buttonLabel = 'Scanning...';
  } else if (state === 'complete' || state === 'error') {
    buttonLabel = 'Scan Again';
  }

  const isDisabled = isInputEmpty || isScanning;

  return (
    <div className={`flex flex-col gap-2 ${className}`} data-testid="scan-button-container">
      <button
        data-testid="scan-button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isScanning}
        aria-label={
          isScanning
            ? 'Scanning input for secrets'
            : isInputEmpty
              ? 'Scan disabled, input text is empty'
              : state === 'complete' || state === 'error'
                ? 'Scan again for secrets'
                : 'Scan input for secrets'
        }
        className={`w-full py-3 px-6 rounded-xl font-semibold font-sans text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
          isDisabled
            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:bg-gray-600 cursor-not-allowed pointer-events-none shadow-none'
            : 'bg-brand-primary text-white hover:bg-brand-600 hover:shadow-lg active:scale-[0.99]'
        }`}
      >
        {isScanning ? (
          <>
            <svg
              data-testid="scan-spinner"
              className="w-5 h-5 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
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
            <span>{buttonLabel}</span>
          </>
        ) : (
          <>
            <span className="text-lg">🔍</span>
            <span>{buttonLabel}</span>
          </>
        )}
      </button>

      {/* User-friendly Error Display */}
      {state === 'error' && error && (
        <div
          data-testid="scan-error-banner"
          aria-live="polite"
          className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-start gap-2 animate-fade-rotate-in"
        >
          <span className="text-base leading-none">⚠️</span>
          <div className="space-y-0.5">
            <span className="font-bold">{error}</span>
            <p className="text-[11px] opacity-80 font-normal">
              Your input text remains safe in memory. You can retry scanning above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
