import React from 'react';

export interface FindingDetailToggleProps {
  readonly expanded: boolean;
  readonly controlsId: string;
  readonly onToggle: () => void;
}

export const FindingDetailToggle: React.FC<FindingDetailToggleProps> = ({
  expanded,
  controlsId,
  onToggle,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <button
      type="button"
      data-testid="finding-detail-toggle"
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className="inline-flex items-center gap-1.5 rounded-full border border-surface-light-border dark:border-surface-dark-border px-3 py-1 text-xs font-semibold text-surface-light-textPrimary dark:text-surface-dark-textPrimary hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 transition-colors"
    >
      {expanded ? 'Hide details' : 'Show details'}
    </button>
  );
};