import React from 'react';
import { formatMaskedPreview } from './finding-card.utils';

export interface FindingPreviewProps {
  readonly maskedValue: string;
}

export const FindingPreview: React.FC<FindingPreviewProps> = ({ maskedValue }) => {
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-[0.18em] text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
        Masked Preview
      </p>
      <code
        data-testid="finding-preview"
        className="block rounded-lg border border-surface-light-border dark:border-surface-dark-border bg-surface-light-bg dark:bg-surface-dark-bg px-3 py-2 font-mono text-sm text-surface-light-textPrimary dark:text-surface-dark-textPrimary overflow-x-auto"
      >
        {formatMaskedPreview(maskedValue)}
      </code>
    </div>
  );
};