import React, { useMemo, useState } from 'react';
import { DetectionLayer, Finding } from '@/types';
import { FindingHeader } from './FindingHeader';
import { FindingMeta } from './FindingMeta';
import { FindingPreview } from './FindingPreview';
import { FindingTags } from './FindingTags';
import { FindingDetailToggle } from './FindingDetailToggle';
import { formatSecretTypeLabel } from './finding-card.utils';

export interface FindingCardProps {
  readonly finding: Finding;
  readonly layerTags?: readonly DetectionLayer[];
  readonly className?: string;
  readonly defaultExpanded?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  layerTags,
  className = '',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const controlsId = `finding-details-${finding.id}`;

  const resolvedLayers = useMemo<readonly DetectionLayer[]>(() => {
    if (layerTags && layerTags.length > 0) {
      return Array.from(new Set(layerTags));
    }

    return [finding.detectionLayer];
  }, [finding.detectionLayer, layerTags]);

  return (
    <article
      data-testid="finding-card"
      aria-labelledby={`finding-title-${finding.id}`}
      className={`rounded-xl border border-surface-light-border dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <FindingHeader
            secretType={finding.secretType}
            confidence={finding.confidence}
            findingId={finding.id}
          />
          <FindingDetailToggle
            expanded={expanded}
            controlsId={controlsId}
            onToggle={() => setExpanded((value) => !value)}
          />
        </div>

        <FindingMeta
          lineNumber={finding.lineNumber}
          columnStart={finding.columnStart}
          columnEnd={finding.columnEnd}
        />

        <FindingPreview maskedValue={finding.maskedValue} />

        <FindingTags layers={resolvedLayers} />

        {expanded && (
          <div id={controlsId} data-testid="finding-detail-body" className="pt-1">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 pr-4 text-left font-medium text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                    Secret Type
                  </th>
                  <td className="py-2 text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
                    {formatSecretTypeLabel(finding.secretType)}
                  </td>
                </tr>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 pr-4 text-left font-medium text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                    Confidence
                  </th>
                  <td className="py-2 text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
                    {finding.confidence}
                  </td>
                </tr>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 pr-4 text-left font-medium text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                    Detection Layer
                  </th>
                  <td className="py-2 text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
                    {resolvedLayers.join(', ')}
                  </td>
                </tr>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 pr-4 text-left font-medium text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                    Masked Preview
                  </th>
                  <td className="py-2 font-mono text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
                    {finding.maskedValue}
                  </td>
                </tr>
                <tr>
                  <th className="py-2 pr-4 align-top text-left font-medium text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
                    Context
                  </th>
                  <td className="py-2 text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {finding.context}
                    </pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
};