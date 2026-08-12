import { ScanProgress, ScanCapabilities } from '@/types';

export const mockScanCapabilities: ScanCapabilities = {
  regexAvailable: true,
  entropyAvailable: true,
  llmAvailable: true,
  webgpuSupported: true,
};

export const mockScanProgress: ScanProgress = {
  status: 'complete',
  stage: 'Scan complete',
  percentage: 100,
  currentEngine: 'LLM Engine',
  findings: [],
};

export const mockScanError = 'Regex engine encountered an unexpected pattern error.';
