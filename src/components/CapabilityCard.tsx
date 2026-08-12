import React from 'react';

export interface CapabilityCardProps {
  /** Human-readable name for the detection layer (e.g., 'Regex', 'Entropy', 'LLM') */
  layer: string;
  /** Whether this layer is currently available */
  status: 'ok' | 'unavailable';
  /** Optional reason explaining why the layer is unavailable */
  reason?: string;
}

/**
 * CapabilityCard renders a single detection layer's availability status with a
 * visual icon and label. Used by StatusIndicators to build the per-layer status row.
 *
 * - status='ok'          → green checkmark
 * - status='unavailable' → amber warning triangle with 'Unavailable' label
 */
export const CapabilityCard: React.FC<CapabilityCardProps> = ({ layer, status, reason }) => {
  const isOk = status === 'ok';

  return (
    <div
      data-testid={`capability-card-${layer.toLowerCase()}`}
      className="flex items-center gap-1.5"
      title={reason ? `${layer}: ${reason}` : `${layer}: ${status}`}
    >
      {isOk ? (
        <svg
          data-testid={`capability-icon-ok-${layer.toLowerCase()}`}
          className="w-3.5 h-3.5 text-emerald-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          data-testid={`capability-icon-unavailable-${layer.toLowerCase()}`}
          className="w-3.5 h-3.5 text-amber-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
      <span
        className={`font-medium ${
          isOk
            ? 'text-surface-light-textPrimary dark:text-surface-dark-textPrimary'
            : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {layer}
      </span>
      {!isOk && (
        <span
          data-testid={`capability-unavailable-label-${layer.toLowerCase()}`}
          className="text-amber-500 dark:text-amber-400"
        >
          Unavailable
        </span>
      )}
    </div>
  );
};
