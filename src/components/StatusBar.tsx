import React from 'react';
import { useModelStatus, ModelLifecycleState } from '@/hooks';
import { PrivacyBadge } from './PrivacyBadge';

function renderModelStateContent(state: ModelLifecycleState, progress: number) {
  switch (state) {
    case 'checking':
      return (
        <span className="flex items-center gap-1.5 text-amber-500 font-medium">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Checking...
        </span>
      );
    case 'downloading':
      return (
        <div className="flex items-center gap-2.5">
          <span className="text-cyan-500 font-medium whitespace-nowrap">
            Downloading model ({Math.round(progress)}%)
          </span>
          <div className="w-24 sm:w-32 h-2 rounded-full bg-surface-light-border dark:bg-surface-dark-border overflow-hidden">
            <div
              data-testid="model-progress-bar"
              className="h-full bg-cyan-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      );
    case 'verifying':
      return (
        <span className="flex items-center gap-1.5 text-amber-500 font-medium">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Verifying integrity...
        </span>
      );
    case 'ready':
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Model Ready
        </span>
      );
    case 'unavailable':
      return (
        <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-medium">
          <span className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500 inline-block rounded-full" />
          Model Unavailable
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-rose-500 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Model Error
        </span>
      );
  }
}

export const StatusBar: React.FC = () => {
  const status = useModelStatus();

  return (
    <footer
      data-testid="status-bar"
      className="w-full mt-auto border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-card/90 dark:bg-surface-dark-card/90 backdrop-blur-md px-4 sm:px-6 py-2.5 text-xs transition-colors duration-300"
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: WebGPU Status & Degraded Mode Message */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <div data-testid="webgpu-status-indicator" className="flex items-center gap-1.5">
            {status.webgpuAvailable ? (
              <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                WebGPU Available
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                WebGPU Unavailable — LLM analysis disabled
              </span>
            )}
          </div>

          {!status.webgpuAvailable && (
            <span
              data-testid="degraded-mode-message"
              className="text-surface-light-textSecondary dark:text-surface-dark-textSecondary border-l border-surface-light-border dark:border-surface-dark-border pl-2.5 hidden md:inline"
            >
              {status.degradedMessage ??
                'Running in standard mode — regex and entropy scanning fully active'}
            </span>
          )}
        </div>

        {/* Center/Right Section: Model Lifecycle State & Download Progress */}
        <div className="flex items-center gap-4">
          <div data-testid="model-lifecycle-indicator">
            {renderModelStateContent(status.modelState, status.downloadProgress)}
          </div>

          {/* Secondary Privacy Badge */}
          <div className="hidden sm:block">
            <PrivacyBadge />
          </div>
        </div>
      </div>
    </footer>
  );
};
