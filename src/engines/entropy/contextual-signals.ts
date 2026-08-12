/**
 * Contextual metadata surrounding a candidate string extracted during orchestration preprocessing.
 */
export interface StringContext {
  /** Variable name assigned to candidate string (if any) */
  variableName?: string;
  /** Surrounding keyword tokens extracted from line or scope */
  surroundingKeywords?: string[];
  /** Assignment or key-value expression (e.g. 'apiKey = ...') */
  assignmentPattern?: string;
}

/** Confidence adjustment action based on contextual signal presence */
export type ConfidenceAdjustment = 'boost' | 'neutral' | 'reduce';

/** Result object returned by contextual signal analysis */
export interface ContextualSignalResult {
  hasSignal: boolean;
  matchedKeywords: string[];
  confidenceAdjustment: ConfidenceAdjustment;
}

/**
 * Standard list of sensitive keywords indicating credential/secret context.
 */
export const DEFAULT_SENSITIVE_KEYWORDS: readonly string[] = [
  'password',
  'secret',
  'token',
  'key',
  'api_key',
  'apikey',
  'credential',
  'auth',
  'private',
  'pwd',
  'pass',
  'access_key',
  'bearer',
  'jwt',
] as const;

/**
 * Analyzes string context (variable names, assignment patterns, surrounding keywords)
 * to determine whether to boost confidence of entropy findings.
 *
 * @param context Extracted StringContext object
 * @param customKeywords Optional custom sensitive keywords list
 * @returns ContextualSignalResult with hasSignal, matchedKeywords, and confidenceAdjustment
 */
export function analyzeContextualSignals(
  context?: StringContext,
  customKeywords?: readonly string[]
): ContextualSignalResult {
  if (!context) {
    return {
      hasSignal: false,
      matchedKeywords: [],
      confidenceAdjustment: 'neutral',
    };
  }

  const keywordList = customKeywords ?? DEFAULT_SENSITIVE_KEYWORDS;
  const matchedKeywordsSet = new Set<string>();

  // Helper to normalize and check string against keyword list
  const checkTextForKeywords = (text: string | undefined) => {
    if (!text || text.trim().length === 0) return;
    const lowerText = text.toLowerCase();

    // Check camelCase / snake_case normalized sub-tokens
    const tokens = lowerText.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^a-z0-9_]+/);

    for (const kw of keywordList) {
      const lowerKw = kw.toLowerCase();
      // Substring match in full text OR direct match in tokens
      if (lowerText.includes(lowerKw) || tokens.some((t) => t.includes(lowerKw))) {
        matchedKeywordsSet.add(lowerKw);
      }
    }
  };

  // Check variable name
  checkTextForKeywords(context.variableName);

  // Check assignment pattern
  checkTextForKeywords(context.assignmentPattern);

  // Check surrounding keywords
  if (context.surroundingKeywords && Array.isArray(context.surroundingKeywords)) {
    for (const kwItem of context.surroundingKeywords) {
      checkTextForKeywords(kwItem);
    }
  }

  const matchedKeywords = Array.from(matchedKeywordsSet);
  const hasSignal = matchedKeywords.length > 0;
  const confidenceAdjustment: ConfidenceAdjustment = hasSignal ? 'boost' : 'neutral';

  return {
    hasSignal,
    matchedKeywords,
    confidenceAdjustment,
  };
}
