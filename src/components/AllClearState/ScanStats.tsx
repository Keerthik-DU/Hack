import React from 'react';

/** Shape of scan statistics passed to the AllClearState component. */
export interface ScanStatsData {
  /** Always 0 for the all-clear state */
  findingsCount: 0;
  /** Total characters in the scanned input */
  charactersScanned: number;
  /** Total lines in the scanned input */
  linesScanned: number;
  /** Total scan duration in milliseconds */
  scanDurationMs: number;
}

export interface ScanStatsProps {
  scanStats: ScanStatsData;
}

/**
 * Formats a scan duration in milliseconds to a human-readable string.
 *
 * - Less than 100 ms → `'< 0.1s'`  (avoids displaying `'0.0s'`)
 * - Otherwise        → `'{N.N}s'`  (one decimal place)
 */
export function formatDuration(ms: number): string {
  if (ms < 100) return '< 0.1s';
  return `${(ms / 1000).toFixed(1)}s`;
}

interface StatCardConfig {
  key: string;
  label: string;
  getValue: (stats: ScanStatsData) => string;
  testId: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'findings',
    label: 'Findings',
    getValue: (stats) => stats.findingsCount.toLocaleString(),
    testId: 'stat-findings',
  },
  {
    key: 'characters',
    label: 'Characters',
    getValue: (stats) => stats.charactersScanned.toLocaleString(),
    testId: 'stat-characters',
  },
  {
    key: 'lines',
    label: 'Lines',
    getValue: (stats) => stats.linesScanned.toLocaleString(),
    testId: 'stat-lines',
  },
  {
    key: 'duration',
    label: 'Duration',
    getValue: (stats) => formatDuration(stats.scanDurationMs),
    testId: 'stat-duration',
  },
];

/**
 * ScanStats — four stat cards (findings, characters, lines, duration) with
 * staggered pop-in animations, each card delayed by 100 ms from the previous.
 *
 * Uses `statPopIn` CSS keyframe animation via the Tailwind `animate-stat-pop-in`
 * utility. The animation class is wrapped in `motion-safe:` to respect
 * prefers-reduced-motion.
 */
export const ScanStats: React.FC<ScanStatsProps> = ({ scanStats }) => (
  <div data-testid="scan-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
    {STAT_CARDS.map((card, index) => (
      <div
        key={card.key}
        data-testid={card.testId}
        className={[
          'flex flex-col items-center justify-center gap-1 p-3',
          'rounded-lg bg-green-50 dark:bg-green-950',
          'border border-green-200 dark:border-green-800',
          'motion-safe:animate-stat-pop-in',
        ].join(' ')}
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
      >
        <span
          data-testid={`${card.testId}-value`}
          className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums"
        >
          {card.getValue(scanStats)}
        </span>
        <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
          {card.label}
        </span>
      </div>
    ))}
  </div>
);
