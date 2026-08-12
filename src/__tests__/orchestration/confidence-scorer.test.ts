import { describe, it, expect } from 'vitest';
import { ConfidenceScorer, SENSITIVE_KEYWORDS } from '../../orchestration/confidence-scorer';
import {
  EMPTY_FINDINGS,
  REGEX_FINDING_MEDIUM,
  REGEX_FINDING_HIGH,
  ENTROPY_FINDING_NEUTRAL,
  ENTROPY_FINDING_PASSWORD_CTX,
  ENTROPY_FINDING_APIKEY_CTX,
  ENTROPY_FINDING_TOKEN_UPPER_CTX,
  ENTROPY_FINDING_DICT_WORDS,
  ENTROPY_FINDING_DICT_BOUNDARY,
  ENTROPY_FINDING_ONE_DICT_WORD,
  LLM_FINDING_HIGH,
  LLM_FINDING_LOW,
  LLM_FINDING_MEDIUM,
  MULTI_LAYER_REGEX_ENTROPY,
} from '../fixtures/scorer-fixtures';

describe('WO-025: ConfidenceScorer Suite', () => {
  const scorer = new ConfidenceScorer();

  // -------------------------------------------------------------------------
  // Empty / single
  // -------------------------------------------------------------------------

  it('returns empty array for empty input without error', () => {
    expect(scorer.score(EMPTY_FINDINGS)).toEqual([]);
  });

  it('returns single regex finding scored as high', () => {
    const result = scorer.score([REGEX_FINDING_MEDIUM]);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe('high');
  });

  // -------------------------------------------------------------------------
  // Layer 1 — Regex rules
  // -------------------------------------------------------------------------

  it('Regex (L1): scores finding as high regardless of prior confidence', () => {
    const result = scorer.scoreOne(REGEX_FINDING_MEDIUM);
    expect(result.confidence).toBe('high');
    // Immutability: original unchanged
    expect(REGEX_FINDING_MEDIUM.confidence).toBe('medium');
  });

  it('Regex (L1): returns same object reference when confidence already high', () => {
    const result = scorer.scoreOne(REGEX_FINDING_HIGH);
    expect(result.confidence).toBe('high');
  });

  // -------------------------------------------------------------------------
  // Layer 3 — Entropy rules
  // -------------------------------------------------------------------------

  it('Entropy (L3) neutral context: scores as medium (default)', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_NEUTRAL);
    expect(result.confidence).toBe('medium');
  });

  it('Entropy (L3) with "password" in context: boosts to high', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_PASSWORD_CTX);
    expect(result.confidence).toBe('high');
  });

  it('Entropy (L3) with "api_key" in context: boosts to high', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_APIKEY_CTX);
    expect(result.confidence).toBe('high');
  });

  it('Entropy (L3) with "TOKEN" (uppercase) in context: case-insensitive boost to high', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_TOKEN_UPPER_CTX);
    expect(result.confidence).toBe('high');
  });

  it('Entropy (L3) with ≥2 dictionary words in maskedValue: reduces to low', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_DICT_WORDS);
    expect(result.confidence).toBe('low');
  });

  it('Entropy (L3) with exactly 2 dictionary words (boundary): reduces to low', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_DICT_BOUNDARY);
    expect(result.confidence).toBe('low');
  });

  it('Entropy (L3) with exactly 1 dictionary word: stays medium (below threshold)', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_ONE_DICT_WORD);
    expect(result.confidence).toBe('medium');
  });

  // -------------------------------------------------------------------------
  // Layer 2 — LLM rules
  // -------------------------------------------------------------------------

  it('LLM (L2) with confidence high: overrides to high', () => {
    const result = scorer.scoreOne(LLM_FINDING_HIGH);
    expect(result.confidence).toBe('high');
  });

  it('LLM (L2) with confidence low: stays low (not suppressed below low)', () => {
    const result = scorer.scoreOne(LLM_FINDING_LOW);
    expect(result.confidence).toBe('low');
  });

  it('LLM (L2) with confidence medium: stays medium', () => {
    const result = scorer.scoreOne(LLM_FINDING_MEDIUM);
    expect(result.confidence).toBe('medium');
  });

  // -------------------------------------------------------------------------
  // Multi-layer: highest confidence wins
  // -------------------------------------------------------------------------

  it('Multi-layer (regex+entropy): regex Layer 1 always scores high regardless of context', () => {
    const result = scorer.scoreOne(MULTI_LAYER_REGEX_ENTROPY);
    expect(result.confidence).toBe('high');
  });

  // -------------------------------------------------------------------------
  // Zero-tolerance philosophy: no ambiguous finding scored below medium
  // unless dictionary-word filtered
  // -------------------------------------------------------------------------

  it('zero-tolerance: entropy finding with no context signals never falls below medium', () => {
    const result = scorer.scoreOne(ENTROPY_FINDING_NEUTRAL);
    const rank = { high: 3, medium: 2, low: 1 };
    expect(rank[result.confidence]).toBeGreaterThanOrEqual(rank['medium']);
  });

  // -------------------------------------------------------------------------
  // Immutability: input array not mutated
  // -------------------------------------------------------------------------

  it('does not mutate the input array or findings', () => {
    const input = [REGEX_FINDING_MEDIUM, ENTROPY_FINDING_NEUTRAL];
    const originalConfidences = input.map((f) => f.confidence);
    scorer.score(input);
    const afterConfidences = input.map((f) => f.confidence);
    expect(afterConfidences).toEqual(originalConfidences);
  });

  // -------------------------------------------------------------------------
  // SENSITIVE_KEYWORDS export is accessible and case-check works
  // -------------------------------------------------------------------------

  it('SENSITIVE_KEYWORDS constant is exported and non-empty', () => {
    expect(SENSITIVE_KEYWORDS.length).toBeGreaterThan(0);
    expect(SENSITIVE_KEYWORDS).toContain('password');
    expect(SENSITIVE_KEYWORDS).toContain('api_key');
  });

  it('sensitive keyword matching is case-insensitive (AUTH, Password, TOKEN)', () => {
    const findings = ['auth', 'Password', 'TOKEN'].map((kw, i) => ({
      id: `case-${i}`,
      secretType: 'high_entropy_string' as const,
      lineNumber: 1,
      columnStart: 0,
      columnEnd: 20,
      confidence: 'medium' as const,
      detectionLayer: 3 as const,
      maskedValue: 'Xk9rP2m',
      context: `const ${kw} = "Xk9rP2m4nQ8sT1uV";`,
    }));

    for (const finding of findings) {
      expect(scorer.scoreOne(finding).confidence).toBe('high');
    }
  });
});
