import { Finding } from '@/types';

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<Finding> & Pick<Finding, 'id'>): Finding {
  return {
    secretType: 'api_key',
    lineNumber: 1,
    columnStart: 0,
    columnEnd: 20,
    confidence: 'medium',
    detectionLayer: 3,
    maskedValue: 'abcdefgh',
    context: 'const x = "abcdefgh";',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Layer 1 — Regex findings
// ---------------------------------------------------------------------------

/** Regex finding (Layer 1) with existing medium confidence — must score as 'high' */
export const REGEX_FINDING_MEDIUM: Finding = makeFinding({
  id: 'regex-1',
  detectionLayer: 1,
  confidence: 'medium',
  secretType: 'aws_access_key',
  maskedValue: 'AKIA****',
  context: 'const key = "AKIA1234567890EXAMPLE";',
});

/** Regex finding (Layer 1) already high confidence — must remain 'high' */
export const REGEX_FINDING_HIGH: Finding = makeFinding({
  id: 'regex-2',
  detectionLayer: 1,
  confidence: 'high',
  secretType: 'jwt',
  maskedValue: 'eyJh****',
  context: 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.xxx',
});

// ---------------------------------------------------------------------------
// Layer 3 — Entropy findings (no sensitive context)
// ---------------------------------------------------------------------------

/** Entropy finding with neutral context — must score as 'medium' */
export const ENTROPY_FINDING_NEUTRAL: Finding = makeFinding({
  id: 'entropy-neutral',
  detectionLayer: 3,
  confidence: 'low',
  secretType: 'high_entropy_string',
  maskedValue: 'Xk9rP2m',
  context: 'const data = "Xk9rP2m4nQ8sT1uV";',
});

// ---------------------------------------------------------------------------
// Layer 3 — Entropy with sensitive keyword in context (boost to high)
// ---------------------------------------------------------------------------

/** Entropy with 'password' in context → boost to 'high' */
export const ENTROPY_FINDING_PASSWORD_CTX: Finding = makeFinding({
  id: 'entropy-password',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'Xk9rP2m',
  context: 'const password = "Xk9rP2m4nQ8sT1uV";',
});

/** Entropy with 'api_key' in context → boost to 'high' */
export const ENTROPY_FINDING_APIKEY_CTX: Finding = makeFinding({
  id: 'entropy-apikey',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'Zq7yK3nL',
  context: 'const api_key = "Zq7yK3nL9pR2sX5vW8tM";',
});

/** Entropy with 'TOKEN' (uppercase) in context → case-insensitive boost to 'high' */
export const ENTROPY_FINDING_TOKEN_UPPER_CTX: Finding = makeFinding({
  id: 'entropy-token-upper',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'Pw4mK9xQ',
  context: 'const TOKEN = "Pw4mK9xQrV2tN6sL";',
});

// ---------------------------------------------------------------------------
// Layer 3 — Entropy with ≥2 dictionary words in maskedValue (reduce to low)
// ---------------------------------------------------------------------------

/** Entropy finding where maskedValue contains 2 English words → 'low' */
export const ENTROPY_FINDING_DICT_WORDS: Finding = makeFinding({
  id: 'entropy-dict',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'hello-world-XkPq9m',
  context: 'const val = "hello-world-XkPq9m";',
});

/** Entropy finding with exactly 2 alpha words in maskedValue (boundary) → 'low' */
export const ENTROPY_FINDING_DICT_BOUNDARY: Finding = makeFinding({
  id: 'entropy-dict-boundary',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'correct-horse-staple',
  context: 'const phrase = "correct-horse-staple";',
});

/** Entropy finding with only 1 dictionary word → stays 'medium' */
export const ENTROPY_FINDING_ONE_DICT_WORD: Finding = makeFinding({
  id: 'entropy-one-word',
  detectionLayer: 3,
  confidence: 'medium',
  secretType: 'high_entropy_string',
  maskedValue: 'hello-Xk9rP2m',
  context: 'const val = "hello-Xk9rP2m";',
});

// ---------------------------------------------------------------------------
// Layer 2 — LLM findings
// ---------------------------------------------------------------------------

/** LLM finding with confidence 'high' → should remain 'high' */
export const LLM_FINDING_HIGH: Finding = makeFinding({
  id: 'llm-high',
  detectionLayer: 2,
  confidence: 'high',
  secretType: 'generic_secret',
  maskedValue: 'sec****',
  context: 'const secret = "sec_live_example12345";',
});

/** LLM finding with confidence 'low' → stays 'low' (not suppressed) */
export const LLM_FINDING_LOW: Finding = makeFinding({
  id: 'llm-low',
  detectionLayer: 2,
  confidence: 'low',
  secretType: 'high_entropy_string',
  maskedValue: 'Xk9rP2m',
  context: 'const hash = "Xk9rP2m4nQ8sT1uV";',
});

/** LLM finding with confidence 'medium' → stays 'medium' */
export const LLM_FINDING_MEDIUM: Finding = makeFinding({
  id: 'llm-medium',
  detectionLayer: 2,
  confidence: 'medium',
  secretType: 'token',
  maskedValue: 'tok****',
  context: 'const token = "tok_live_example12345";',
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

/** Empty array */
export const EMPTY_FINDINGS: Finding[] = [];

/** Single regex finding */
export const SINGLE_REGEX_FINDING: Finding[] = [REGEX_FINDING_MEDIUM];

/** Multi-layer: regex + entropy → max(high, medium) = 'high' (regex wins) */
export const MULTI_LAYER_REGEX_ENTROPY: Finding = makeFinding({
  id: 'multi-regex-entropy',
  detectionLayer: 1, // Regex wins for layer-based scoring
  confidence: 'medium',
  secretType: 'aws_access_key',
  maskedValue: 'AKIA****',
  context: 'const key = "AKIA1234567890EXAMPLE";',
});
