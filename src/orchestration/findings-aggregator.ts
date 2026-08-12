import { Finding, ConfidenceLevel } from '@/types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Returns the confidence level with the higher rank between two findings.
 */
function higherConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}

/**
 * Computes the overlap ratio between two findings using document-level column offsets.
 * Overlap ratio = (overlap length) / (length of the SMALLER range).
 * Returns 0 if the findings are on different lines or there is no overlap.
 */
function computeOverlapRatio(a: Finding, b: Finding): number {
  // Cross-line findings: treat column offsets as absolute document offsets when
  // on different lines (no merge across lines with column-based ranges).
  if (a.lineNumber !== b.lineNumber) return 0;

  const overlapStart = Math.max(a.columnStart, b.columnStart);
  const overlapEnd = Math.min(a.columnEnd, b.columnEnd);

  if (overlapStart >= overlapEnd) {
    // Adjacent (touching) or non-overlapping
    return 0;
  }

  const overlapLen = overlapEnd - overlapStart;
  const lenA = a.columnEnd - a.columnStart;
  const lenB = b.columnEnd - b.columnStart;
  const smallerLen = Math.min(lenA, lenB);

  if (smallerLen <= 0) return 0;

  return overlapLen / smallerLen;
}

/**
 * Merges two findings into a single unified finding.
 * - Union range (min start, max end)
 * - Highest confidence wins
 * - Secret type retained from highest-confidence contributor (a wins on tie)
 * - Detection layer set to the higher-priority layer (lower number = higher priority)
 */
function mergeTwoFindings(a: Finding, b: Finding): Finding {
  const winnerConfidence = higherConfidence(a.confidence, b.confidence);
  const winner = CONFIDENCE_RANK[a.confidence] >= CONFIDENCE_RANK[b.confidence] ? a : b;

  return {
    id: `${a.id}+${b.id}`,
    secretType: winner.secretType,
    lineNumber: Math.min(a.lineNumber, b.lineNumber),
    columnStart: Math.min(a.columnStart, b.columnStart),
    columnEnd: Math.max(a.columnEnd, b.columnEnd),
    confidence: winnerConfidence,
    detectionLayer: Math.min(a.detectionLayer, b.detectionLayer) as 1 | 2 | 3,
    maskedValue: winner.maskedValue,
    context: winner.context,
  };
}

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

/**
 * FindingsAggregator merges findings from multiple detection layers into a
 * unified, deduplicated result set using an O(n log n) sort + O(n) greedy
 * merge-window pass.
 *
 * Handles four overlap cases:
 *  1. Non-overlapping   → kept as separate findings
 *  2. Partially overlapping (>50% of smaller range) → merged with union range
 *  3. Fully contained   → inner absorbed by outer
 *  4. Identical ranges  → merged with highest confidence + combined layers
 */
export class FindingsAggregator {
  /**
   * Accepts an unsorted array of findings from multiple layers and returns a
   * deduplicated, merged array sorted by lineNumber then columnStart.
   */
  public aggregate(findings: readonly Finding[]): Finding[] {
    if (!findings || findings.length === 0) return [];
    if (findings.length === 1) return [findings[0]];

    // Sort by lineNumber ASC, then columnStart ASC
    const sorted = [...findings].sort((a, b) => {
      if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
      return a.columnStart - b.columnStart;
    });

    const result: Finding[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const ratio = computeOverlapRatio(current, next);

      if (ratio > 0.5) {
        // Merge: overlap >50% of the smaller range
        current = mergeTwoFindings(current, next);
      } else {
        // No significant overlap — emit current, advance window
        result.push(current);
        current = next;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Merges LLM analysis results into existing findings by matching character ranges
   * (same line + overlapping columns). Updates confidence/secretType from the LLM
   * finding when a match is found; unmatched LLM findings are appended.
   */
  public mergeLLMResults(
    existing: readonly Finding[],
    llmResults: readonly Finding[]
  ): Finding[] {
    if (!llmResults || llmResults.length === 0) {
      return this.aggregate(existing);
    }
    if (!existing || existing.length === 0) {
      return this.aggregate(llmResults);
    }

    const remainingLlm = [...llmResults];
    const updated = existing.map((finding) => {
      const matchIdx = remainingLlm.findIndex(
        (llm) =>
          llm.lineNumber === finding.lineNumber &&
          computeOverlapRatio(finding, llm) > 0.5
      );
      if (matchIdx === -1) return finding;
      const [llmFinding] = remainingLlm.splice(matchIdx, 1);
      return {
        ...finding,
        confidence: llmFinding.confidence,
        secretType: llmFinding.secretType,
        detectionLayer: 2 as const,
        maskedValue: llmFinding.maskedValue || finding.maskedValue,
        context: llmFinding.context || finding.context,
      };
    });

    return this.aggregate([...updated, ...remainingLlm]);
  }
}
