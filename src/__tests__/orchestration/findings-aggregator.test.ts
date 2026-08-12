import { describe, it, expect } from 'vitest';
import { FindingsAggregator } from '../../orchestration/findings-aggregator';
import {
  EMPTY_FINDINGS,
  SINGLE_FINDING,
  IDENTICAL_RANGE_FINDINGS,
  PARTIAL_OVERLAP_MERGE_FINDINGS,
  PARTIAL_OVERLAP_NO_MERGE_FINDINGS,
  FULLY_CONTAINED_FINDINGS,
  ADJACENT_FINDINGS,
  MULTI_LINE_FINDINGS,
  SAME_LAYER_DIFFERENT_RANGE,
  TRANSITIVE_CHAIN_CLEAR,
  LARGE_FINDINGS_ARRAY,
} from '../fixtures/aggregator-fixtures';

describe('WO-024: FindingsAggregator Suite', () => {
  const aggregator = new FindingsAggregator();

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('returns empty array for empty input', () => {
    expect(aggregator.aggregate(EMPTY_FINDINGS)).toEqual([]);
  });

  it('returns single finding unchanged for single-element input', () => {
    const result = aggregator.aggregate(SINGLE_FINDING);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  // -------------------------------------------------------------------------
  // Case 1 — Identical ranges
  // -------------------------------------------------------------------------

  it('Case 1: merges findings with identical character ranges, highest confidence wins', () => {
    const result = aggregator.aggregate(IDENTICAL_RANGE_FINDINGS);
    expect(result).toHaveLength(1);

    const merged = result[0];
    // high > medium, so Layer 1 (aws_access_key) should win
    expect(merged.confidence).toBe('high');
    expect(merged.secretType).toBe('aws_access_key');
    expect(merged.columnStart).toBe(10);
    expect(merged.columnEnd).toBe(30);
    // Layer 1 (regex) wins as lower layer number
    expect(merged.detectionLayer).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Case 2 — Partial overlap >50% (should merge)
  // -------------------------------------------------------------------------

  it('Case 2: merges partially overlapping findings with ratio >50% into expanded union range', () => {
    // b1: 0-20, b2: 10-25 → overlap=10, smaller=15 → ratio≈0.67 > 0.5 → merge
    const result = aggregator.aggregate(PARTIAL_OVERLAP_MERGE_FINDINGS);
    expect(result).toHaveLength(1);

    const merged = result[0];
    expect(merged.columnStart).toBe(0);
    expect(merged.columnEnd).toBe(25);
  });

  // -------------------------------------------------------------------------
  // Case 3 — Partial overlap ≤50% (should NOT merge)
  // -------------------------------------------------------------------------

  it('Case 3: preserves partially overlapping findings with ratio ≤50% as separate findings', () => {
    // c1: 0-40, c2: 30-50 → overlap=10, smaller=20 → ratio=0.5 (not >0.5) → separate
    const result = aggregator.aggregate(PARTIAL_OVERLAP_NO_MERGE_FINDINGS);
    expect(result).toHaveLength(2);
    expect(result[0].columnStart).toBe(0);
    expect(result[1].columnStart).toBe(30);
  });

  // -------------------------------------------------------------------------
  // Case 4 — Fully contained (inner absorbed by outer)
  // -------------------------------------------------------------------------

  it('Case 4: merges fully contained finding into outer range, highest confidence wins', () => {
    // d1: 0-100 (medium), d2: 20-80 (high) → d2 is inside d1 → merge → 0-100, high, api_key
    const result = aggregator.aggregate(FULLY_CONTAINED_FINDINGS);
    expect(result).toHaveLength(1);

    const merged = result[0];
    expect(merged.columnStart).toBe(0);
    expect(merged.columnEnd).toBe(100);
    expect(merged.confidence).toBe('high');
    expect(merged.secretType).toBe('api_key');
  });

  // -------------------------------------------------------------------------
  // Edge: Adjacent (touching) ranges — should NOT merge
  // -------------------------------------------------------------------------

  it('keeps adjacent (touching, non-overlapping) findings separate', () => {
    // f1: 0-20, f2: 20-40 → overlap=0 → separate
    const result = aggregator.aggregate(ADJACENT_FINDINGS);
    expect(result).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // Edge: Multi-line findings — should NOT merge across lines
  // -------------------------------------------------------------------------

  it('keeps findings on different lines separate even with same column ranges', () => {
    const result = aggregator.aggregate(MULTI_LINE_FINDINGS);
    expect(result).toHaveLength(2);
    expect(result[0].lineNumber).toBe(1);
    expect(result[1].lineNumber).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Edge: Same layer, different ranges — should NOT merge
  // -------------------------------------------------------------------------

  it('keeps findings from the same layer with non-overlapping ranges separate', () => {
    const result = aggregator.aggregate(SAME_LAYER_DIFFERENT_RANGE);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('h1');
    expect(result[1].id).toBe('h2');
  });

  // -------------------------------------------------------------------------
  // Transitive chain: A overlaps B, B overlaps C → all merge into 1
  // -------------------------------------------------------------------------

  it('transitively merges a chain where A overlaps B and merged AB overlaps C', () => {
    // j1:0-20, j2:8-28 → overlap 12/20=0.6 > 0.5 → merged:0-28
    // merged(0-28) + j3:16-36 → overlap 12/20=0.6 > 0.5 → merged:0-36
    const result = aggregator.aggregate(TRANSITIVE_CHAIN_CLEAR);
    expect(result).toHaveLength(1);
    expect(result[0].columnStart).toBe(0);
    expect(result[0].columnEnd).toBe(36);
  });

  // -------------------------------------------------------------------------
  // Unsorted input — should sort before processing
  // -------------------------------------------------------------------------

  it('correctly aggregates unsorted input by sorting before merging', () => {
    const unsorted = [
      IDENTICAL_RANGE_FINDINGS[1], // a2 (columnStart 10)
      IDENTICAL_RANGE_FINDINGS[0], // a1 (columnStart 10)
    ];
    const result = aggregator.aggregate(unsorted);
    expect(result).toHaveLength(1);
    expect(result[0].columnStart).toBe(10);
  });

  // -------------------------------------------------------------------------
  // Performance: 500 findings under 50ms
  // -------------------------------------------------------------------------

  it('SLA Performance: completes aggregate() on 500 findings in under 50ms', () => {
    const start = performance.now();
    const result = aggregator.aggregate(LARGE_FINDINGS_ARRAY);
    const duration = performance.now() - start;

    console.log(
      `[WO-024 SLA] aggregate(500 findings) completed in ${duration.toFixed(2)}ms (target <50ms)`
    );
    expect(duration).toBeLessThan(50);
    // 500 non-overlapping → should remain 500
    expect(result.length).toBeGreaterThan(0);
  });
});
