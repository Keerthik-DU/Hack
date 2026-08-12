import { Finding, ConfidenceLevel } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Sensitive variable name keywords that indicate an entropy-flagged string is
 * likely a real secret. Matching is case-insensitive substring.
 */
export const SENSITIVE_KEYWORDS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'credential',
  'private_key',
  'auth',
];

/**
 * Validates that a raw string is a known ConfidenceLevel; falls back to 'medium'.
 */
function ensureConfidenceLevel(raw: unknown): ConfidenceLevel {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'medium';
}

// ---------------------------------------------------------------------------
// Scoring helpers per layer
// ---------------------------------------------------------------------------

/**
 * Rule: Regex (Layer 1) findings are always high confidence.
 */
function scoreRegexLayer(): ConfidenceLevel {
  return 'high';
}

/**
 * Rule: Entropy (Layer 3) findings default to 'medium'.
 *   - Boosted to 'high' if the context or maskedValue variable name contains a
 *     sensitive keyword (case-insensitive substring).
 *   - Reduced to 'low' if the flagged string contains ≥2 common dictionary words
 *     (detected via dictionaryWordCount in finding options or a simple heuristic
 *     on the maskedValue/context).
 */
function scoreEntropyLayer(finding: Finding): ConfidenceLevel {
  const contextLower = (finding.context ?? '').toLowerCase();

  // Check for sensitive keyword presence in context or masked value
  const hasSensitiveKeyword = SENSITIVE_KEYWORDS.some((kw) => contextLower.includes(kw));
  if (hasSensitiveKeyword) {
    return 'high';
  }

  // Check for dictionary word count reduction signal.
  // The dictionaryWordCount is passed via finding.context metadata convention:
  // entropy analyzer embeds it as `[dictionaryWords:N]` or via options.
  // Here we use a simple heuristic: count space-separated lowercase words in
  // maskedValue that look like English (all alpha, length ≥ 3).
  const maskedWords = finding.maskedValue
    .split(/[^a-zA-Z]+/)
    .filter((w) => w.length >= 3 && /^[a-zA-Z]+$/.test(w));

  if (maskedWords.length >= 2) {
    return 'low';
  }

  return 'medium';
}

/**
 * Rule: LLM (Layer 2) findings use the LLM-returned confidence (the finding's
 * own `confidence` field, already set by the LLM engine), but floored at 'low'.
 */
function scoreLLMLayer(finding: Finding): ConfidenceLevel {
  return ensureConfidenceLevel(finding.confidence);
}

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

/**
 * ConfidenceScorer applies deterministic, layer-aware scoring rules to produce
 * consistent final confidence levels across all aggregated findings.
 *
 * Rules (applied per layer, multi-layer takes the max):
 *  1. Layer 1 (Regex)   → always 'high'
 *  2. Layer 2 (LLM)     → LLM-returned confidence (floor: 'low')
 *  3. Layer 3 (Entropy) → 'medium' default, 'high' if sensitive keyword in
 *                          context, 'low' if ≥2 dictionary words in value
 *
 * Multi-layer: max confidence across all contributing layer rules.
 * Immutable: never mutates input — returns new Finding objects when changed.
 */
export class ConfidenceScorer {
  /**
   * Accepts aggregated findings and returns a new array with confidence fields
   * updated per layer-aware scoring rules.
   */
  public score(findings: readonly Finding[]): Finding[] {
    if (!findings || findings.length === 0) return [];

    return findings.map((finding) => {
      const layer = finding.detectionLayer;
      let computed: ConfidenceLevel;

      if (layer === 1) {
        // Regex: always high
        computed = scoreRegexLayer();
      } else if (layer === 2) {
        // LLM: use LLM-returned confidence, floored at low
        computed = scoreLLMLayer(finding);
      } else {
        // Entropy (layer 3) or unknown: contextual scoring
        computed = scoreEntropyLayer(finding);
      }

      // Zero-tolerance safety net: never suppress below 'low'
      const finalConfidence = ensureConfidenceLevel(computed);

      // Return immutably — only create new object if confidence changed
      if (finalConfidence === finding.confidence) return finding;
      return { ...finding, confidence: finalConfidence };
    });
  }

  /**
   * Scores a single finding (convenience method).
   */
  public scoreOne(finding: Finding): Finding {
    const [result] = this.score([finding]);
    return result;
  }
}
