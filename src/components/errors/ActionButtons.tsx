import React from 'react';

export type ActionButtonVariant = 'primary' | 'secondary';

export interface ActionDefinition {
  readonly label: string;
  readonly onClick?: () => void;
  readonly variant: ActionButtonVariant;
  readonly disabled?: boolean;
  /** Accessible name; defaults to label. */
  readonly ariaLabel?: string;
  readonly testId?: string;
}

export interface ActionButtonsProps {
  readonly actions: readonly ActionDefinition[];
  readonly className?: string;
}

/**
 * Typed action button group for ErrorCard (WO-046).
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({ actions, className = '' }) => {
  return (
    <div
      data-testid="action-buttons"
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Error recovery actions"
    >
      {actions.map((action) => {
        const disabled = Boolean(action.disabled || !action.onClick);
        const base =
          action.variant === 'primary'
            ? 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-900'
            : 'border border-surface-light-border bg-surface-light-bg text-surface-light-textPrimary hover:bg-surface-light-border/40 disabled:opacity-50 dark:border-surface-dark-border dark:bg-surface-dark-bg dark:text-surface-dark-textPrimary dark:hover:bg-surface-dark-border/40';

        return (
          <button
            key={action.label}
            type="button"
            data-testid={action.testId ?? `action-button-${action.label}`}
            aria-label={action.ariaLabel ?? action.label}
            disabled={disabled}
            onClick={() => action.onClick?.()}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              base,
            ].join(' ')}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
};
