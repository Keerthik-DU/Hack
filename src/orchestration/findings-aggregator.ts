import { Finding } from '@/types';

/**
 * Deduplicates overlapping or identical findings across Layer 1 (Regex), Layer 3 (Entropy), and Layer 2 (LLM).
 */
export class FindingsAggregator {
  /**
   * Merges and deduplicates findings from multiple detection layers.
   */
  public aggregate(findings: readonly Finding[]): Finding[] {
    if (!findings || findings.length === 0) {
      return [];
    }

    const resultMap = new Map<string, Finding>();

    for (const finding of findings) {
      // Key by line number and column span
      const key = `${finding.lineNumber}:${finding.columnStart}:${finding.columnEnd}`;
      const existing = resultMap.get(key);

      if (!existing) {
        resultMap.set(key, finding);
      } else {
        // Prefer Layer 1 (Regex) exact classification over generic high_entropy_string
        const preferred =
          finding.detectionLayer === 1 ||
          (existing.secretType === 'high_entropy_string' &&
            finding.secretType !== 'high_entropy_string')
            ? finding
            : existing;

        resultMap.set(key, preferred);
      }
    }

    return Array.from(resultMap.values()).sort((a, b) => {
      if (a.lineNumber !== b.lineNumber) return a.lineNumber - b.lineNumber;
      return a.columnStart - b.columnStart;
    });
  }
}
