import React from 'react';

export const PlaceholderInputPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full space-y-4" data-testid="placeholder-input-panel">
      <div className="flex justify-between items-center pb-3 border-b border-surface-light-border dark:border-surface-dark-border">
        <h3 className="text-lg font-semibold text-brand-primary">Input Source Text</h3>
        <span className="text-xs text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
          0 characters
        </span>
      </div>
      <div className="flex-1 min-h-[280px] p-4 rounded-lg bg-surface-light-bg dark:bg-surface-dark-bg border border-dashed border-surface-light-border dark:border-surface-dark-border text-sm text-surface-light-textSecondary dark:text-surface-dark-textSecondary flex items-center justify-center text-center">
        Paste code, environment variables, API logs, or JSON configurations here to scan for
        secrets...
      </div>
    </div>
  );
};

export const PlaceholderResultsPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full space-y-4" data-testid="placeholder-results-panel">
      <div className="flex justify-between items-center pb-3 border-b border-surface-light-border dark:border-surface-dark-border">
        <h3 className="text-lg font-semibold text-brand-primary">Detection Findings</h3>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
          Clean
        </span>
      </div>
      <div className="flex-1 min-h-[280px] p-4 rounded-lg bg-surface-light-bg dark:bg-surface-dark-bg border border-surface-light-border dark:border-surface-dark-border flex flex-col items-center justify-center text-center space-y-3">
        <span className="text-3xl" role="img" aria-label="shield check">
          🛡️
        </span>
        <h4 className="text-base font-semibold">No Secrets Exposed</h4>
        <p className="text-xs text-surface-light-textSecondary dark:text-surface-dark-textSecondary max-w-xs">
          Your input is analyzed locally client-side. Detected API keys or credentials will be
          flagged here.
        </p>
      </div>
    </div>
  );
};
