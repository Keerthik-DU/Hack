import React from 'react';

export interface ScannerLayoutProps {
  /** Slot for the input panel content (left/top) */
  inputPanel: React.ReactNode;
  /** Slot for the scan results panel content (right/bottom) */
  resultsPanel: React.ReactNode;
  /** Optional progressive scan overlay (WO-055 ProgressPanel) */
  progressOverlay?: React.ReactNode;
  /** Optional container CSS class overrides */
  className?: string;
}

export const ScannerLayout: React.FC<ScannerLayoutProps> = ({
  inputPanel,
  resultsPanel,
  progressOverlay,
  className = '',
}) => {
  return (
    <div
      data-testid="scanner-layout"
      className={`relative grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto ${className}`}
    >
      {progressOverlay ? (
        <div
          data-testid="progress-overlay-slot"
          className="absolute inset-0 z-20 flex items-start justify-center bg-surface-light-card/80 p-4 dark:bg-surface-dark-card/80 backdrop-blur-sm"
          role="dialog"
          aria-label="Scan progress"
        >
          <div className="w-full max-w-lg rounded-xl border border-surface-light-border bg-surface-light-card p-2 shadow-lg dark:border-surface-dark-border dark:bg-surface-dark-card">
            {progressOverlay}
          </div>
        </div>
      ) : null}

      {/* Input Panel Slot */}
      <section
        data-testid="input-panel-slot"
        className="animate-panel-slide-left flex flex-col p-4 sm:p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border shadow-md hover:shadow-lg transition-shadow duration-300 min-h-[420px]"
      >
        {inputPanel}
      </section>

      {/* Results Panel Slot */}
      <section
        data-testid="results-panel-slot"
        className="animate-panel-slide-right flex flex-col p-4 sm:p-6 rounded-xl bg-surface-light-card dark:bg-surface-dark-card border border-surface-light-border dark:border-surface-dark-border shadow-md hover:shadow-lg transition-shadow duration-300 min-h-[420px]"
      >
        {resultsPanel}
      </section>
    </div>
  );
};
