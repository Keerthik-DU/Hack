import { RegexEngine } from '@/engines/regex/regex-engine';
import { EntropyAnalyzer } from '@/engines/entropy/entropy-analyzer';
import type { IDetectionEngine } from '@/engines/types';
import { ScanOrchestrator, ScanOrchestratorOptions } from './scan-orchestrator';
import { WorkerDispatcher } from './WorkerDispatcher';

export interface CreateDefaultOrchestratorOptions extends ScanOrchestratorOptions {
  /**
   * Optional Layer 2 LLM analyzer. When omitted or unavailable, the pipeline
   * degrades to regex + entropy only (progressive disclosure unchanged).
   */
  readonly llmAnalyzer?: IDetectionEngine;
  /** When false, skip computation worker wiring (tests). Default true. */
  readonly enableComputationWorker?: boolean;
}

/**
 * Builds the production ScanOrchestrator with regex + entropy engines,
 * optionally including an LLMAnalyzer as Layer 2.
 */
export function createDefaultScanOrchestrator(
  options?: CreateDefaultOrchestratorOptions
): ScanOrchestrator {
  const { llmAnalyzer, enableComputationWorker = true, ...orchestratorOptions } =
    options ?? {};
  const engines: IDetectionEngine[] = [new RegexEngine(), new EntropyAnalyzer()];
  if (llmAnalyzer) {
    engines.push(llmAnalyzer);
  }
  const workerDispatcher =
    orchestratorOptions.workerDispatcher ??
    (enableComputationWorker ? new WorkerDispatcher() : undefined);
  if (workerDispatcher) {
    workerDispatcher.initialize();
  }
  return new ScanOrchestrator(engines, {
    ...orchestratorOptions,
    workerDispatcher,
  });
}
