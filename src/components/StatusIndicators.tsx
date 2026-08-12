import React from 'react';
import { useModelStatus, EngineStatus } from '@/hooks';
import { CapabilityCard } from './CapabilityCard';

/**
 * Maps an EngineStatus to the CapabilityCard status prop.
 */
function toCapabilityStatus(status: EngineStatus): 'ok' | 'unavailable' {
  return status === 'ready' ? 'ok' : 'unavailable';
}

/**
 * StatusIndicators renders per-layer availability indicators in the app header.
 *
 * In degraded mode (WebGPU unavailable or under memory pressure):
 *   - Regex → green checkmark
 *   - Entropy → green checkmark
 *   - LLM → amber warning icon with 'Unavailable' label
 *
 * In full capability mode all three layers show a green checkmark.
 */
export const StatusIndicators: React.FC = () => {
  const statusMap = useModelStatus();

  const layers: Array<{ key: 'regex' | 'entropy' | 'llm'; label: string }> = [
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
        const engineStatus: EngineStatus = statusMap[key] ?? 'unavailable';
        const capStatus = toCapabilityStatus(engineStatus);
        const reason =
          key === 'llm' && capStatus === 'unavailable'
            ? (statusMap.webgpuUnavailableReason ?? statusMap.degradedMessage)
            : undefined;

        return (
          <CapabilityCard
            key={key}
            layer={label}
            status={capStatus}
            reason={reason}
          />
        );
      })}
    </div>
  );
};
