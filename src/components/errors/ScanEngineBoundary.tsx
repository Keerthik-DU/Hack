import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '@/infra/logger';
import { ErrorCode } from '@/types/scan';
import { createScanEngineError, sanitizeErrorMessage } from '@/errors/airgap-error';

export interface ScanEngineBoundaryProps {
  readonly children: ReactNode;
  /** Full scan retry — typically useScanEngine.reset() + re-scan; preserves input panel. */
  readonly onRetryScan?: () => void;
  readonly className?: string;
  /** When true, show the all-layers-failed messaging (edge case). */
  readonly allLayersFailed?: boolean;
}

interface ScanEngineBoundaryState {
  readonly hasError: boolean;
  readonly errorMessage: string;
}

/**
 * Top-level scan results Error Boundary (WO-044).
 * Catches catastrophic errors that escape per-layer boundaries; preserves the input panel.
 */
export class ScanEngineBoundary extends Component<
  ScanEngineBoundaryProps,
  ScanEngineBoundaryState
> {
  state: ScanEngineBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): ScanEngineBoundaryState {
    return {
      hasError: true,
      errorMessage: sanitizeErrorMessage(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const airgapError = createScanEngineError({
      code: ErrorCode.SCAN_ENGINE_FAILED,
      message: error.message || 'Scan engine encountered an unexpected error',
      cause: error,
    });

    Logger.error('Scan engine boundary caught catastrophic error', airgapError, {
      code: ErrorCode.SCAN_ENGINE_FAILED,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetryScan?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const headline = this.props.allLayersFailed
        ? 'All detection layers encountered errors. Please retry.'
        : 'Scan encountered an unexpected error';

      return (
        <div
          data-testid="scan-engine-boundary-fallback"
          role="alert"
          className={[
            'rounded-lg border border-red-500/50 bg-red-50 dark:bg-red-950/30',
            'px-4 py-6 text-center text-sm text-red-900 dark:text-red-100',
            this.props.className ?? '',
          ].join(' ')}
        >
          <p className="text-base font-semibold">{headline}</p>
          <p className="mt-2 text-red-800 dark:text-red-200">
            {this.state.errorMessage || 'Your input was preserved. You can retry the scan.'}
          </p>
          <button
            type="button"
            data-testid="scan-engine-retry"
            onClick={this.handleRetry}
            className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Retry Scan
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
