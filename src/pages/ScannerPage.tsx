import React, { useMemo, useState } from 'react';
import {
  ScannerLayout,
  PasteInputPanel,
  ResultsPanel,
  DesignTokenShowcase,
} from '@/components';
import { ResultsPanelScanEngine } from '@/components/ResultsPanel';

export const ScannerPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');

  // Idle engine snapshot until the page is wired to a live useScanEngine instance.
  const idleEngine = useMemo<ResultsPanelScanEngine>(
    () => ({
      state: 'idle',
      findings: [],
      progress: null,
      error: null,
    }),
    []
  );

  return (
    <div className="space-y-12">
      <ScannerLayout
        inputPanel={<PasteInputPanel value={inputText} onTextChange={setInputText} />}
        resultsPanel={<ResultsPanel scanEngine={idleEngine} originalText={inputText} />}
      />
      <div className="pt-8 border-t border-surface-light-border dark:border-surface-dark-border">
        <DesignTokenShowcase />
      </div>
    </div>
  );
};

export default ScannerPage;
