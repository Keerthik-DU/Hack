/**
 * Smoothed ETA calculator for model downloads.
 * Uses exponential moving average of bytes/sec to avoid jittery countdowns.
 */

export interface EtaSample {
  readonly bytesLoaded: number;
  readonly totalBytes: number;
  readonly elapsedMs: number;
}

const EMA_ALPHA = 0.3;

let lastRate = 0;

/** Reset EMA state (tests / new download). */
export function resetEtaCalculator(): void {
  lastRate = 0;
}

/**
 * Returns a human-readable ETA string, or 'Calculating...' when indeterminate.
 */
export function calculateEta(sample: EtaSample): string {
  const { bytesLoaded, totalBytes, elapsedMs } = sample;
  if (totalBytes <= 0 || bytesLoaded <= 0 || elapsedMs <= 0) {
    return 'Calculating...';
  }
  const instantRate = bytesLoaded / (elapsedMs / 1000);
  lastRate = lastRate === 0 ? instantRate : EMA_ALPHA * instantRate + (1 - EMA_ALPHA) * lastRate;
  if (lastRate <= 0) return 'Calculating...';
  const remaining = Math.max(0, totalBytes - bytesLoaded);
  const seconds = Math.ceil(remaining / lastRate);
  if (!Number.isFinite(seconds) || seconds < 0) return 'Calculating...';
  if (seconds < 60) return `${seconds}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s remaining`;
}
