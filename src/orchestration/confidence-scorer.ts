import { Finding, ConfidenceLevel } from '@/types';

/**
 * Calculates final confidence scores for aggregated secret findings.
 */
export class ConfidenceScorer {
  /**
   * Scores and returns updated findings with finalized confidence levels.
   */
  public score(findings: readonly Finding[]): Finding[] {
    if (!findings || findings.length === 0) {
      return [];
    }

    return findings.map((finding) => {
      let finalConfidence: ConfidenceLevel = finding.confidence;

      // Rule 1: Layer 1 (Regex) exact pattern match always maintains high confidence
      if (finding.detectionLayer === 1) {
        finalConfidence = 'high';
      }

      // Rule 2: If context includes sensitive keywords, boost medium to high
      if (
        finalConfidence === 'medium' &&
        /password|secret|token|key|api_key|credential/i.test(finding.context)
      ) {
        finalConfidence = 'high';
      }

      if (finalConfidence === finding.confidence) {
        return finding;
      }

      return {
        ...finding,
        confidence: finalConfidence,
      };
    });
  }
}
