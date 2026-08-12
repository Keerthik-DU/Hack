import React from 'react';
import { OverallProgress } from './OverallProgress';
import { LayerProgressCard } from './LayerProgressCard';
import { EarlyFindings } from './EarlyFindings';
import type { LayerProgressStatus } from '@/orchestration/scan-progress-types';
import type { Finding } from '@/types';

export interface ProgressPanelProps {
  readonly overallPercent: number;
  readonly elapsedMs: number;
  readonly layerStatuses: Record<'regex' | 'entropy' | 'llm', LayerProgressStatus>;
  readonly layerPercents?: Partial<Record<'regex' | 'entropy' | 'llm', number>>;
  readonly layerDetails?: Partial<Record<'regex' | 'entropy' | 'llm', string>>;
  readonly earlyFindings: readonly Finding[];
  readonly inputSizeLabel?: string;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  overallPercent,
  elapsedMs,
  layerStatuses,
  layerPercents = {},
  layerDetails = {},
  earlyFindings,
  inputSizeLabel,
}) => (
  <section data-testid="progress-panel" className="space-y-4 p-4" aria-label="Scan progress">
    <OverallProgress overallPercent={overallPercent} elapsedMs={elapsedMs} sublabel={inputSizeLabel} />
    <div className="grid gap-2">
      <LayerProgressCard layerName="Regex" status={layerStatuses.regex} percentage={layerPercents.regex} detail={layerDetails.regex} />
      <LayerProgressCard layerName="Entropy" status={layerStatuses.entropy} percentage={layerPercents.entropy} detail={layerDetails.entropy} />
      <LayerProgressCard layerName="LLM" status={layerStatuses.llm} percentage={layerPercents.llm} detail={layerDetails.llm} />
    </div>
    <EarlyFindings findings={earlyFindings} />
  </section>
);
