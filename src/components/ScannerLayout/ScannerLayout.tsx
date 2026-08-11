import React from 'react';

export interface ScannerLayoutProps {
  /** Slot for the input panel content (left/top) */
  inputPanel: React.ReactNode;
  /** Slot for the scan results panel content (right/bottom) */
  resultsPanel: React.ReactNode;
  /** Optional container CSS class overrides */
  className?: string;
}

export const ScannerLayout: React.FC<ScannerLayoutProps> = ({
  inputPanel,
  resultsPanel,
  className = '',
}) => {
  return (
    <div
      data-testid="scanner-layout"
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto ${className}`}
    >
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
