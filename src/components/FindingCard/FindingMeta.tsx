import React from 'react';

export interface FindingMetaProps {
  readonly lineNumber: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}

export const FindingMeta: React.FC<FindingMetaProps> = ({ lineNumber, columnStart, columnEnd }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-light-textSecondary dark:text-surface-dark-textSecondary">
      <span>
        Line {lineNumber}
      </span>
      <span>
        Characters {columnStart}-{columnEnd}
      </span>
    </div>
  );
};