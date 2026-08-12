import { ScanProgress, ScanCapabilities, ErrorCode } from '@/types';
import { ScanError } from '../useScanEngine';

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

export const mockScanError: ScanError = {
  code: ErrorCode.UNKNOWN_ERROR,
  message: 'Regex engine encountered an unexpected pattern error',
  failedLayer: 'Regex Engine (Layer 1)',
};

export const mockLlmScanError: ScanError = {
  code: ErrorCode.MODEL_LOAD_FAILED,
  message: 'LLM engine model execution failed due to WebGPU context loss',
  failedLayer: 'LLM Engine (Layer 3)',
};
