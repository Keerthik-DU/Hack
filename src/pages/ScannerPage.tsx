import React, { useState } from 'react';
import {
  ScannerLayout,
  PasteInputPanel,
  PlaceholderResultsPanel,
  DesignTokenShowcase,
} from '@/components';

export const ScannerPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');

  return (
    <div className="space-y-12">
      <ScannerLayout
        inputPanel={<PasteInputPanel value={inputText} onTextChange={setInputText} />}
        resultsPanel={<PlaceholderResultsPanel />}
      />
      <div className="pt-8 border-t border-surface-light-border dark:border-surface-dark-border">
        <DesignTokenShowcase />
      </div>
    </div>
  );
};

export default ScannerPage;
