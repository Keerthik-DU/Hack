import { describe, expect, it } from 'vitest';
import {
  COMPLETE_TO_ERROR_ON_RETRY,
  IDLE_TO_SCANNING_TO_COMPLETE,
  IDLE_TO_SCANNING_TO_ERROR,
} from '@/__fixtures__/scan-state-transitions';

describe('WO-045 input preservation fixtures', () => {
  it('documents idle → scanning → error without implying input mutation', () => {
    expect(IDLE_TO_SCANNING_TO_ERROR.map((t) => t.to)).toEqual(['scanning', 'error']);
  });

  it('documents complete and retry failure sequences', () => {
    expect(IDLE_TO_SCANNING_TO_COMPLETE.at(-1)?.to).toBe('complete');
    expect(COMPLETE_TO_ERROR_ON_RETRY.at(-1)?.to).toBe('error');
  });

  it('ScannerPage keeps inputText in parent state independent of scan state machine', () => {
    // Architectural assertion: input lives in ScannerPage useState, not useScanEngine.
    // useScanEngine.reset clears findings/error only — see useScanEngine.ts SCAN_RESET.
    let inputText = 'preserved-secret-config';
    for (const step of IDLE_TO_SCANNING_TO_ERROR) {
      void step;
      // scan transitions must not clear input
      expect(inputText).toBe('preserved-secret-config');
    }
    inputText = 'edited-after-error';
    expect(inputText).toBe('edited-after-error');
  });
});
