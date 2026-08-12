import React, { memo, useMemo } from 'react';
import { Finding } from '@/types';
import { sortFindingsByConfidenceThenLine } from '@/types/scan-progress';
import { FindingCard } from '@/components/FindingCard';

export interface FindingsListProps {
  readonly findings: readonly Finding[];
  readonly className?: string;
}

const MemoFindingCard = memo(FindingCard);

/**
 * FindingsList — sorted FindingCard list with entrance animation.
 * Sort: confidence high→medium→low, then lineNumber ascending (stable).
 */
export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  className = '',
}) => {
  const sorted = useMemo(
    () => sortFindingsByConfidenceThenLine(findings),
    [findings]
  );

  return (
    <ul
      data-testid="findings-list"
      className={`flex flex-col gap-3 ${className}`}
      aria-label="Scan findings sorted by confidence"
    >
      {sorted.map((finding) => (
        <li
          key={finding.id}
          data-testid={`finding-list-item-${finding.id}`}
          data-finding-id={finding.id}
          className="motion-safe:animate-finding-enter"
          style={{ contentVisibility: 'auto' }}
        >
          <MemoFindingCard finding={finding} />
        </li>
      ))}
    </ul>
  );
};

export { sortFindingsByConfidenceThenLine };
