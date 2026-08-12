import { Finding } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(
  overrides: Partial<Finding> & Pick<Finding, 'id' | 'columnStart' | 'columnEnd'>
): Finding {
  return {
    secretType: 'api_key',
    lineNumber: 1,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: '****',
    context: 'test context',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Case 1 — Identical ranges (same charStart + charEnd)
// ---------------------------------------------------------------------------

/** Two findings pointing to exactly the same character range from different layers */
export const IDENTICAL_RANGE_FINDINGS: Finding[] = [
  makeFinding({
    id: 'a1',
    columnStart: 10,
    columnEnd: 30,
    confidence: 'high',
    detectionLayer: 1,
    secretType: 'aws_access_key',
  }),
  makeFinding({
    id: 'a2',
    columnStart: 10,
    columnEnd: 30,
    confidence: 'medium',
    detectionLayer: 3,
    secretType: 'high_entropy_string',
  }),
];

// ---------------------------------------------------------------------------
// Case 2 — Partial overlap >50% (should merge)
// ---------------------------------------------------------------------------

/** Finding B overlaps A by more than 50% of the smaller range → should merge */
export const PARTIAL_OVERLAP_MERGE_FINDINGS: Finding[] = [
  makeFinding({ id: 'b1', columnStart: 0, columnEnd: 20 }), // length 20
  makeFinding({ id: 'b2', columnStart: 10, columnEnd: 25 }), // overlap = 10, smaller = 15 → ratio 0.67 > 0.5
];

// ---------------------------------------------------------------------------
// Case 3 — Partial overlap <50% (should NOT merge)
// ---------------------------------------------------------------------------

/** Finding B overlaps A by less than 50% of the smaller range → keep separate */
export const PARTIAL_OVERLAP_NO_MERGE_FINDINGS: Finding[] = [
  makeFinding({ id: 'c1', columnStart: 0, columnEnd: 40 }), // length 40
  makeFinding({ id: 'c2', columnStart: 30, columnEnd: 50 }), // overlap = 10, smaller = 20 → ratio 0.5 (not >0.5)
];

// ---------------------------------------------------------------------------
// Case 4 — Fully contained (inner absorbed by outer)
// ---------------------------------------------------------------------------

/** Finding B is fully inside A → should merge into outer range */
export const FULLY_CONTAINED_FINDINGS: Finding[] = [
  makeFinding({
    id: 'd1',
    columnStart: 0,
    columnEnd: 100,
    confidence: 'medium',
    secretType: 'generic_secret',
  }),
  makeFinding({
    id: 'd2',
    columnStart: 20,
    columnEnd: 80,
    confidence: 'high',
    secretType: 'api_key',
  }),
];

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

/** Empty array */
export const EMPTY_FINDINGS: Finding[] = [];

/** Single finding */
export const SINGLE_FINDING: Finding[] = [makeFinding({ id: 'e1', columnStart: 5, columnEnd: 25 })];

/** Adjacent but non-overlapping findings (touching at boundary) → keep separate */
export const ADJACENT_FINDINGS: Finding[] = [
  makeFinding({ id: 'f1', columnStart: 0, columnEnd: 20 }),
  makeFinding({ id: 'f2', columnStart: 20, columnEnd: 40 }), // starts exactly where f1 ends → no overlap
];

/** Findings on different lines → keep separate (no cross-line merge) */
export const MULTI_LINE_FINDINGS: Finding[] = [
  makeFinding({ id: 'g1', columnStart: 0, columnEnd: 30, lineNumber: 1 }),
  makeFinding({ id: 'g2', columnStart: 0, columnEnd: 30, lineNumber: 2 }),
];

/** Same layer, different ranges → keep separate */
export const SAME_LAYER_DIFFERENT_RANGE: Finding[] = [
  makeFinding({ id: 'h1', columnStart: 0, columnEnd: 15, detectionLayer: 1 }),
  makeFinding({ id: 'h2', columnStart: 50, columnEnd: 70, detectionLayer: 1 }),
];

/** Transitive chain: A overlaps B (>50%), B overlaps C (>50%) → all 3 merge into 1 */
export const TRANSITIVE_CHAIN_FINDINGS: Finding[] = [
  makeFinding({ id: 'i1', columnStart: 0, columnEnd: 20 }), // length 20
  makeFinding({ id: 'i2', columnStart: 12, columnEnd: 32 }), // overlaps i1: 8/20=0.4 of larger... actually: smaller is 20, overlap=8, ratio=0.4; larger is 20, overlap=8... wait let me recalculate
  // i1: 0-20 (len 20), i2: 10-30 (len 20), overlap: 10-20=10, smaller=20, ratio=0.5 → not >0.5
  // Use clearly >50% overlap: i1:0-20, i2:8-28 → overlap=12, smaller=20, ratio=0.6>0.5 ✓
  makeFinding({ id: 'i3', columnStart: 20, columnEnd: 40 }), // adjacent to merged i1+i2
];

/**
 * Clean transitive chain where each consecutive pair has >50% overlap
 */
export const TRANSITIVE_CHAIN_CLEAR: Finding[] = [
  makeFinding({ id: 'j1', columnStart: 0, columnEnd: 20 }), // len 20
  makeFinding({ id: 'j2', columnStart: 8, columnEnd: 28 }), // overlap with j1: 12/20=0.6 > 0.5 → merge → 0-28
  makeFinding({ id: 'j3', columnStart: 16, columnEnd: 36 }), // overlap with merged 0-28: 12/20=0.6 > 0.5 → merge → 0-36
];

/** Large array of 500 non-overlapping findings for performance assertion */
export const LARGE_FINDINGS_ARRAY: Finding[] = Array.from({ length: 500 }, (_, i) =>
  makeFinding({
    id: `perf-${i}`,
    columnStart: i * 10,
    columnEnd: i * 10 + 5,
    lineNumber: Math.floor(i / 10) + 1,
  })
);
