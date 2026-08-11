import React from 'react';
import {
  ScannerLayout,
  PlaceholderInputPanel,
  PlaceholderResultsPanel,
  DesignTokenShowcase,
} from '@/components';

export const ScannerPage: React.FC = () => {
  return (
    <div className="space-y-12">
      <ScannerLayout
        inputPanel={<PlaceholderInputPanel />}
        resultsPanel={<PlaceholderResultsPanel />}
      />
      <div className="pt-8 border-t border-surface-light-border dark:border-surface-dark-border">
        <DesignTokenShowcase />
      </div>
    </div>
  );
};
