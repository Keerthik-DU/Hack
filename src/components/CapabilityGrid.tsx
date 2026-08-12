import React from 'react';

export type CapabilityStatus = 'ready' | 'loading' | 'unavailable';

export interface CapabilityGridProps {
  readonly regex: CapabilityStatus;
  readonly entropy: CapabilityStatus;
  readonly llm: CapabilityStatus;
  readonly className?: string;
}

const LABELS = [
  { key: 'regex' as const, title: 'Regex' },
  { key: 'entropy' as const, title: 'Entropy' },
  { key: 'llm' as const, title: 'LLM' },
];

function StatusIcon({ status }: { status: CapabilityStatus }) {
  if (status === 'ready') {
    return (
      <span data-testid="capability-icon-ready" aria-label="ready" className="text-emerald-600">
        ✓
      </span>
    );
  }
  if (status === 'loading') {
    return (
      <span
        data-testid="capability-icon-loading"
        aria-label="loading"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
      />
    );
  }
  return (
    <span data-testid="capability-icon-unavailable" aria-label="unavailable" className="text-amber-600">
      ⚠
    </span>
  );
}

export const CapabilityGrid: React.FC<CapabilityGridProps> = ({
  regex,
  entropy,
  llm,
  className = '',
}) => {
  const statuses = { regex, entropy, llm };
  return (
    <div
      data-testid="capability-grid"
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}
    >
      {LABELS.map(({ key, title }) => (
        <div
          key={key}
          data-testid={`capability-card-${key}`}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
        >
          <StatusIcon status={statuses[key]} />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs capitalize text-slate-500">{statuses[key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
