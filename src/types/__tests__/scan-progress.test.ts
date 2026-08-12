import { describe, expect, it } from 'vitest';
import {
  deriveLayerStatuses,
  sortFindingsByConfidenceThenLine,
  toResultsScanProgress,
} from '../scan-progress';
import { progressiveFindings } from '@/test/fixtures/scan-progress';

describe('WO-029: scan-progress helpers', () => {
  it('sortFindingsByConfidenceThenLine orders high first then by line', () => {
    const sorted = sortFindingsByConfidenceThenLine([
      progressiveFindings.entropyLow,
      progressiveFindings.regexMedium,
      progressiveFindings.regexHigh,
    ]);
    expect(sorted.map((f) => f.id)).toEqual([
      progressiveFindings.regexHigh.id,
      progressiveFindings.regexMedium.id,
      progressiveFindings.entropyLow.id,
    ]);
  });

  it('deriveLayerStatuses uses explicit layerStatuses when present', () => {
    const statuses = deriveLayerStatuses({
      status: 'scanning',
      stage: 'ignored',
      percentage: 10,
      findings: [],
      layerStatuses: {
        regex: 'complete',
        entropy: 'running',
        llm: 'unavailable',
      },
    });
    expect(statuses).toEqual({
      regex: 'complete',
      entropy: 'running',
      llm: 'unavailable',
    });
  });

  it('toResultsScanProgress normalizes missing progress to idle defaults', () => {
    const view = toResultsScanProgress(null);
    expect(view.status).toBe('idle');
    expect(view.findings).toEqual([]);
    expect(view.layerStatuses.regex).toBe('pending');
  });
});
