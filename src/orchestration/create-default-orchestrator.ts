import { RegexEngine } from '@/engines/regex/regex-engine';
import { EntropyAnalyzer } from '@/engines/entropy/entropy-analyzer';
import { ScanOrchestrator, ScanOrchestratorOptions } from './scan-orchestrator';

/**
 * Builds the production ScanOrchestrator with regex + entropy engines.
 * LLM engine is omitted until the WebLLM worker path is wired; capability
 * probing via useModelStatus still drives the degradation banner UX.
 */
export function createDefaultScanOrchestrator(
  options?: ScanOrchestratorOptions
): ScanOrchestrator {
  return new ScanOrchestrator([new RegexEngine(), new EntropyAnalyzer()], options);
}
