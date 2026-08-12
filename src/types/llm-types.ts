import type { Finding, SecretType } from './finding';

/**
 * Ambiguous finding with required surrounding context lines for Layer 2 LLM analysis.
 * Extends the core Finding shape with contextLines used by the LLM Web Worker prompt.
 */
export interface AmbiguousFinding extends Finding {
  /** Surrounding source lines (±5) included in the LLM user prompt */
  readonly contextLines: string[];
  /** Entropy score when the finding originated from the entropy analyzer */
  readonly entropyScore?: number;
  /** Candidate secret types when classification is ambiguous */
  readonly candidates?: readonly SecretType[];
}

/**
 * Structured verdict returned by the LLM for a single ambiguous finding.
 */
export type LLMVerdict = 'real_secret' | 'false_positive' | 'uncertain';

/**
 * Parsed LLM analysis outcome for one finding.
 */
export interface LLMAnalysisResult {
  /** Finding id the verdict applies to */
  readonly findingId: string;
  /** Classification verdict from the model */
  readonly verdict: LLMVerdict;
  /** Model confidence in [0, 1] */
  readonly confidence: number;
  /** Optional short rationale from the model */
  readonly reasoning?: string;
}
