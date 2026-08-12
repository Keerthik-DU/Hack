import React, { useMemo } from 'react';
import { LayerStatus } from '@/types';
import { ScenarioTag } from './ScenarioTag';
import { ErrorBanner, WarningBanner } from './ErrorBanner';
import { InputLimitBar } from './InputLimitBar';
import { ActionButtons, type ActionDefinition } from './ActionButtons';
import { LayerStatusList } from './LayerStatusList';

export type ErrorCardVariant =
  | 'llm-crash'
  | 'input-too-large'
  | 'model-download-failure'
  | 'integrity-failure';

export interface ErrorCardProps {
  readonly variant: ErrorCardVariant;
  readonly errorMessage?: string;
  readonly layerStatuses?: readonly LayerStatus[];
  readonly characterCount?: number;
  readonly maxCharacterCount?: number;
  readonly onRetryLLM?: () => void;
  readonly onViewPartialResults?: () => void;
  readonly onRetryDownload?: () => void;
  readonly onContinueWithoutLLM?: () => void;
  readonly onRedownloadModel?: () => void;
  readonly className?: string;
}

const INPUT_LIMIT_MESSAGE = 'Input exceeds 100,000 character limit';
const INTEGRITY_MESSAGE = 'Model integrity verification failed (SHA-256 mismatch)';

function sanitizeUserFacing(message: string | undefined, fallback: string): string {
  if (!message || !message.trim()) return fallback;
  // Never surface stack-like / path-like content in the UI.
  const cleaned = message
    .replace(/\r?\n\s*at\s+.*/g, '')
    .replace(/[A-Za-z]:\\[^\s]+/g, '[path]')
    .replace(/\/(?:Users|home|var|tmp)\/[^\s]+/g, '[path]')
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Scenario-specific error card composing WO-046 sub-components.
 */
export const ErrorCard: React.FC<ErrorCardProps> = ({
  variant,
  errorMessage,
  layerStatuses = [],
  characterCount = 0,
  maxCharacterCount = 100_000,
  onRetryLLM,
  onViewPartialResults,
  onRetryDownload,
  onContinueWithoutLLM,
  onRedownloadModel,
  className = '',
}) => {
  const content = useMemo(() => {
    switch (variant) {
      case 'llm-crash': {
        const actions: ActionDefinition[] = [
          {
            label: 'Retry LLM',
            variant: 'primary',
            onClick: onRetryLLM,
            ariaLabel: 'Retry LLM',
            testId: 'error-card-retry-llm',
          },
          {
            label: 'View Partial Results',
            variant: 'secondary',
            onClick: onViewPartialResults,
            ariaLabel: 'View Partial Results',
            testId: 'error-card-view-partial',
          },
        ];
        return {
          tag: 'LLM Worker Crash',
          tagSeverity: 'error' as const,
          banner: (
            <ErrorBanner
              severity="error"
              message={sanitizeUserFacing(errorMessage, 'LLM worker crashed during analysis')}
            />
          ),
          layers: true,
          limitBar: false,
          scanDisabled: false,
          actions,
        };
      }
      case 'input-too-large': {
        const actions: ActionDefinition[] = [
          {
            label: 'Scan',
            variant: 'primary',
            disabled: true,
            ariaLabel: 'Scan (disabled — input exceeds limit)',
            testId: 'error-card-scan-disabled',
          },
        ];
        return {
          tag: 'Input Too Large',
          tagSeverity: 'warning' as const,
          banner: <WarningBanner severity="warning" message={INPUT_LIMIT_MESSAGE} />,
          layers: false,
          limitBar: true,
          scanDisabled: true,
          actions,
        };
      }
      case 'model-download-failure': {
        const actions: ActionDefinition[] = [
          {
            label: 'Retry Download',
            variant: 'primary',
            onClick: onRetryDownload,
            ariaLabel: 'Retry Download',
            testId: 'error-card-retry-download',
          },
          {
            label: 'Continue Without LLM',
            variant: 'secondary',
            onClick: onContinueWithoutLLM,
            ariaLabel: 'Continue Without LLM',
            testId: 'error-card-continue-without-llm',
          },
        ];
        return {
          tag: 'Model Download Failure',
          tagSeverity: 'warning' as const,
          banner: (
            <WarningBanner
              severity="warning"
              message={sanitizeUserFacing(
                errorMessage,
                'Model download failed. Regex and Entropy layers remain available.'
              )}
            />
          ),
          layers: true,
          limitBar: false,
          scanDisabled: false,
          actions,
        };
      }
      case 'integrity-failure': {
        const actions: ActionDefinition[] = [
          {
            label: 'Re-download Model',
            variant: 'primary',
            onClick: onRedownloadModel,
            ariaLabel: 'Re-download Model',
            testId: 'error-card-redownload',
          },
          {
            label: 'Continue Without LLM',
            variant: 'secondary',
            onClick: onContinueWithoutLLM,
            ariaLabel: 'Continue Without LLM',
            testId: 'error-card-continue-without-llm',
          },
        ];
        return {
          tag: 'Integrity Failure',
          tagSeverity: 'error' as const,
          banner: <ErrorBanner severity="error" message={INTEGRITY_MESSAGE} />,
          layers: false,
          limitBar: false,
          scanDisabled: false,
          actions,
        };
      }
      default: {
        const actions: ActionDefinition[] = [
          {
            label: 'Continue Without LLM',
            variant: 'secondary',
            onClick: onContinueWithoutLLM,
            ariaLabel: 'Continue Without LLM',
          },
        ];
        return {
          tag: 'Unknown Error',
          tagSeverity: 'error' as const,
          banner: <ErrorBanner severity="error" message="Unknown error occurred" />,
          layers: false,
          limitBar: false,
          scanDisabled: false,
          actions,
        };
      }
    }
  }, [
    variant,
    errorMessage,
    onRetryLLM,
    onViewPartialResults,
    onRetryDownload,
    onContinueWithoutLLM,
    onRedownloadModel,
  ]);

  return (
    <section
      data-testid="error-card"
      data-variant={variant}
      aria-label={`${content.tag} error`}
      className={[
        'space-y-3 rounded-xl border border-surface-light-border bg-surface-light-bg p-4',
        'dark:border-surface-dark-border dark:bg-surface-dark-bg',
        className,
      ].join(' ')}
    >
      <ScenarioTag label={content.tag} severity={content.tagSeverity} />
      {content.limitBar ? (
        <InputLimitBar currentCount={characterCount} maxCount={maxCharacterCount} />
      ) : null}
      {content.banner}
      {content.layers ? <LayerStatusList layerStatuses={layerStatuses} compact /> : null}
      <ActionButtons actions={content.actions} />
    </section>
  );
};
