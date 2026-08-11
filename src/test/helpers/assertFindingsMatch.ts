import { Finding } from '@/types';
import { ExpectedFinding } from '../fixtures/schema';

export interface FindingMatchResult {
  readonly matches: boolean;
  readonly differences: readonly string[];
}

/**
 * Compares actual detected findings against expected findings, returning match status and diff list.
 */
export function assertFindingsMatch(
  actual: readonly Finding[],
  expected: readonly ExpectedFinding[]
): FindingMatchResult {
  const differences: string[] = [];

  if (actual.length !== expected.length) {
    differences.push(`Count mismatch: expected ${expected.length} findings, got ${actual.length}`);
  }

  for (let i = 0; i < expected.length; i++) {
    const exp = expected[i];
    const act = actual[i];

    if (!act) {
      differences.push(`Missing finding at index ${i}: expected ${exp.secretType}`);
      continue;
    }

    if (act.secretType !== exp.secretType) {
      differences.push(
        `Finding [${i}] secretType mismatch: expected "${exp.secretType}", got "${act.secretType}"`
      );
    }

    if (act.lineNumber !== exp.lineNumber) {
      differences.push(
        `Finding [${i}] lineNumber mismatch: expected ${exp.lineNumber}, got ${act.lineNumber}`
      );
    }

    if (act.confidence !== exp.confidence) {
      differences.push(
        `Finding [${i}] confidence mismatch: expected "${exp.confidence}", got "${act.confidence}"`
      );
    }

    if (exp.detectionLayer !== undefined && act.detectionLayer !== exp.detectionLayer) {
      differences.push(
        `Finding [${i}] detectionLayer mismatch: expected ${exp.detectionLayer}, got ${act.detectionLayer}`
      );
    }
  }

  return {
    matches: differences.length === 0,
    differences,
  };
}
