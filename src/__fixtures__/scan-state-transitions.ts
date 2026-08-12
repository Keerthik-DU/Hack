import type { ScanProgressStatus } from '@/types/scan';

export type ScanStateTransition = {
  readonly from: ScanProgressStatus;
  readonly to: ScanProgressStatus;
  readonly label: string;
};

/** Canonical sequences for WO-045 input-preservation tests. */
export const IDLE_TO_SCANNING_TO_ERROR: readonly ScanStateTransition[] = [
  { from: 'idle', to: 'scanning', label: 'start' },
  { from: 'scanning', to: 'error', label: 'layer failure' },
];

export const IDLE_TO_SCANNING_TO_COMPLETE: readonly ScanStateTransition[] = [
  { from: 'idle', to: 'scanning', label: 'start' },
  { from: 'scanning', to: 'complete', label: 'success' },
];

export const ERROR_TO_IDLE: readonly ScanStateTransition[] = [
  { from: 'error', to: 'idle', label: 'reset' },
];

export const COMPLETE_TO_ERROR_ON_RETRY: readonly ScanStateTransition[] = [
  { from: 'complete', to: 'scanning', label: 'retry' },
  { from: 'scanning', to: 'error', label: 'retry failure' },
];
