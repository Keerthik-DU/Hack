import React, { Component, ErrorInfo, ReactNode } from 'react';
import { DetectionLayerName } from '@/types';
import { Logger } from '@/infra/logger';
import { ErrorCode } from '@/types/scan';
import { createDetectionLayerError, sanitizeErrorMessage } from '@/errors/airgap-error';

export interface DetectionLayerBoundaryProps {
  readonly layer: DetectionLayerName;
  readonly children: ReactNode;
  /** Re-invoke only the failed layer's analysis (not the full pipeline). */
  readonly onRetry?: (layer: DetectionLayerName) => void;
  readonly className?: string;
}

interface DetectionLayerBoundaryState {
  readonly hasError: boolean;
  readonly errorMessage: string;
}

const LAYER_LABELS: Record<DetectionLayerName, string> = {
  regex: 'Regex',
  entropy: 'Entropy',
  llm: 'LLM',
};

/**
 * Per-detection-layer React Error Boundary (WO-044).
 * Catches render errors in a layer's result section and shows a retryable fallback.
 */
export class DetectionLayerBoundary extends Component<
  DetectionLayerBoundaryProps,
  DetectionLayerBoundaryState
> {
  state: DetectionLayerBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): DetectionLayerBoundaryState {
    return {
      hasError: true,
      errorMessage: sanitizeErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const airgapError = createDetectionLayerError({
      code: ErrorCode.DETECTION_LAYER_FAILED,
      message: error.message || `${this.props.layer} render failed`,
      layer: this.props.layer,
      cause: error,
    });

    Logger.error(`${this.props.layer} layer render error`, airgapError, {
      code: ErrorCode.DETECTION_LAYER_FAILED,
      layer: this.props.layer,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry?.(this.props.layer);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const label = LAYER_LABELS[this.props.layer];
      return (
        <div
          data-testid={`detection-layer-boundary-fallback-${this.props.layer}`}
          role="alert"
          className={[
            'rounded-lg border border-amber-500/60 bg-amber-50 dark:bg-amber-950/30',
            'px-4 py-3 text-sm text-amber-900 dark:text-amber-100',
            this.props.className ?? '',
          ].join(' ')}
        >
          <p className="font-semibold">{label} layer failed</p>
          <p className="mt-1 text-amber-800 dark:text-amber-200">
            {this.state.errorMessage || 'An unexpected error occurred while rendering results.'}
          </p>
          <button
            type="button"
            data-testid={`detection-layer-retry-${this.props.layer}`}
            onClick={this.handleRetry}
            className="mt-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Retry {label}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
