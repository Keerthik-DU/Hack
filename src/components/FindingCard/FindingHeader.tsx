import React from 'react';
import { ConfidenceLevel, SecretType } from '@/types';
import { formatSecretTypeLabel, getConfidenceBadgeClass } from './finding-card.utils';

export interface FindingHeaderProps {
  readonly secretType: SecretType;
  readonly confidence: ConfidenceLevel;
  readonly findingId: string;
}

export const FindingHeader: React.FC<FindingHeaderProps> = ({ secretType, confidence, findingId }) => {
  const confidenceClass = getConfidenceBadgeClass(confidence);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
          Finding
        </p>
        <h3 id={`finding-title-${findingId}`} className="text-base font-semibold text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
          {formatSecretTypeLabel(secretType)}
        </h3>
      </div>

      <span
        data-testid="confidence-badge"
        className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${confidenceClass}`}
      >
        {confidence}
      </span>
    </div>
  );
};