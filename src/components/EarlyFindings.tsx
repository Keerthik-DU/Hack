import React from 'react';
import type { Finding } from '@/types';

export interface EarlyFindingsProps {
  readonly findings: readonly Finding[];
}

export const EarlyFindings = React.memo(function EarlyFindings({ findings }: EarlyFindingsProps) {
  const shown = findings.slice(0, 10);
  const extra = findings.length - shown.length;
  return (
    <div data-testid="early-findings" className="space-y-1" aria-live="polite">
      <h3 className="text-sm font-semibold">Early findings</h3>
      <ul className="max-h-40 space-y-1 overflow-auto">
        {shown.map((f) => (
          <li key={f.id} className="text-xs" data-testid="early-finding-item">
            {f.secretType} @ line {f.lineNumber}
          </li>
        ))}
      </ul>
      {extra > 0 ? <p data-testid="early-findings-more">+{extra} more</p> : null}
    </div>
  );
});
