import React, { useEffect, useMemo, useState } from 'react';
import {
  ScannerLayout,
  PasteInputPanel,
  ResultsPanel,
  DesignTokenShowcase,
  DegradationBanner,
  ScanButton,
} from '@/components';
import { useScanEngine } from '@/hooks';
import { createDefaultScanOrchestrator } from '@/orchestration';

export const ScannerPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');

  const orchestrator = useMemo(() => createDefaultScanOrchestrator(), []);
  const scanEngine = useScanEngine(orchestrator);

  // Deterministic scan-phase marker for Playwright zero-network monitoring (WO-050).
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (scanEngine.state === 'scanning') {
      document.body.setAttribute('data-scan-phase', 'active');
    } else {
      document.body.setAttribute('data-scan-phase', 'idle');
    }
  }, [scanEngine.state]);

  return (
    <div className="space-y-12" data-testid="scanner-page">
      <DegradationBanner />
      <ScannerLayout
        inputPanel={
          <div className="flex flex-col h-full gap-4">
            <PasteInputPanel value={inputText} onTextChange={setInputText} />
            <ScanButton
              inputText={inputText}
              engine={{
                scan: scanEngine.scan,
                state: scanEngine.state,
                error: scanEngine.error,
              }}
            />
          </div>
        }
        resultsPanel={<ResultsPanel scanEngine={scanEngine} originalText={inputText} />}
      />
      <div className="pt-8 border-t border-surface-light-border dark:border-surface-dark-border">
        <DesignTokenShowcase />
      </div>
    </div>
  );
};

export default ScannerPage;
