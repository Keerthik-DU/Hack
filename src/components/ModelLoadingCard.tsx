import React from 'react';
import type { DownloadProgress, ModelLifecycleState } from '@/types/model-lifecycle';
import { ModelProgressBar } from './ModelProgressBar';
import { CapabilityGrid, type CapabilityStatus } from './CapabilityGrid';

export interface ModelLoadingCardProps {
  readonly status: ModelLifecycleState;
  readonly progress: DownloadProgress | null;
  readonly elapsedMs?: number;
  readonly regexStatus?: CapabilityStatus;
  readonly entropyStatus?: CapabilityStatus;
  readonly className?: string;
}

const PHASES: ModelLifecycleState[] = [
  'checking-webgpu',
  'checking-cache',
  'downloading',
  'verifying-download',
  'ready',
];

export const ModelLoadingCard: React.FC<ModelLoadingCardProps> = ({
  status,
  progress,
  elapsedMs,
  regexStatus = 'ready',
  entropyStatus = 'ready',
  className = '',
}) => {
  const llmStatus: CapabilityStatus =
    status === 'ready' ? 'ready' : status === 'error' || status === 'degraded' ? 'unavailable' : 'loading';

  return (
    <section
      data-testid="model-loading-card"
      className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 ${className}`}
    >
      <header>
        <h2 className="text-lg font-semibold">Loading LLM model</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You can scan immediately with regex and entropy detection
        </p>
      </header>
      <ModelProgressBar status={status} progress={progress} elapsedMs={elapsedMs} />
      <ul data-testid="model-loading-steps" className="text-sm space-y-1">
        {PHASES.map((phase) => (
          <li key={phase} className={status === phase || status === 'ready' ? 'font-medium' : 'opacity-60'}>
            {phase}
          </li>
        ))}
      </ul>
      <CapabilityGrid regex={regexStatus} entropy={entropyStatus} llm={llmStatus} />
    </section>
  );
};
