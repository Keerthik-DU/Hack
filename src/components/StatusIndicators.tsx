import React from 'react';
import { useModelStatus, EngineStatus } from '@/hooks';

function getStatusColorClass(status: EngineStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500';
    case 'loading':
      return 'bg-amber-500 animate-pulse';
    case 'unavailable':
      return 'bg-gray-400 dark:bg-gray-600';
  }
}

export const StatusIndicators: React.FC = () => {
  const statusMap = useModelStatus();

  const layers: Array<{ key: keyof typeof statusMap; label: string }> = [
    { key: 'regex', label: 'Regex' },
    { key: 'entropy', label: 'Entropy' },
    { key: 'llm', label: 'LLM' },
  ];

  return (
    <div
      aria-label="Detection engine status"
      data-testid="status-indicators"
      className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-surface-light-bg/50 dark:bg-surface-dark-bg/50 border border-surface-light-border dark:border-surface-dark-border text-xs text-surface-light-textSecondary dark:text-surface-dark-textSecondary"
    >
      {layers.map(({ key, label }) => {
        const status = statusMap[key];
        const dotColorClass = getStatusColorClass(status);
        return (
          <div key={key} className="flex items-center gap-1.5" title={`${label} Engine: ${status}`}>
            <span
              data-testid={`status-dot-${key}`}
              className={`w-2 h-2 rounded-full ${dotColorClass}`}
            />
            <span className="font-medium text-surface-light-textPrimary dark:text-surface-dark-textPrimary">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
