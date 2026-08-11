import React from 'react';
import { useScanEngine, UseScanEngineOptions } from '@/hooks';

export interface ScanButtonProps {
  /** Source input text to be scanned */
  inputText?: string;
  /** Optional callback fired when scan starts */
  onScanTriggered?: (text: string) => void;
  /** Custom CSS class overrides */
  className?: string;
  /** Custom options for internal useScanEngine hook (e.g. delay, shouldFail) */
  scanEngineOptions?: UseScanEngineOptions;
}

export const ScanButton: React.FC<ScanButtonProps> = ({
  inputText = '',
  onScanTriggered,
  className = '',
  scanEngineOptions,
}) => {
  const { triggerScan, status, error } = useScanEngine(scanEngineOptions);

  const isInputEmpty = !inputText || inputText.trim().length === 0;
  const isScanning = status === 'scanning';

  const handleClick = async () => {
    if (isInputEmpty || isScanning) {
      return;
    }

    onScanTriggered?.(inputText);
    await triggerScan(inputText);
  };

  // Button text & state resolution
  let buttonLabel = 'Scan';
  if (status === 'scanning') {
    buttonLabel = 'Scanning...';
  } else if (status === 'complete' || status === 'error') {
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
              : status === 'complete' || status === 'error'
                ? 'Scan again for secrets'
                : 'Scan input for secrets'
        }
        className={`w-full py-3 px-6 rounded-xl font-semibold font-sans text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
          isDisabled
            ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed pointer-events-none shadow-none'
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

      {/* User-friendly Error Display (Identifying layer without stack traces) */}
      {status === 'error' && error && (
        <div
          data-testid="scan-error-banner"
          aria-live="polite"
          className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-start gap-2 animate-fade-rotate-in"
        >
          <span className="text-base leading-none">⚠️</span>
          <div className="space-y-0.5">
            <span className="font-bold">
              {error.failedLayer ? `${error.failedLayer}: ` : ''}
              {error.message}
            </span>
            <p className="text-[11px] opacity-80 font-normal">
              Your input text remains safe in memory. You can retry scanning above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
