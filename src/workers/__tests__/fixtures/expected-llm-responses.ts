import type { LLMAnalysisResult } from '@/types/llm-types';

/** Expected structured LLM JSON payloads keyed by finding id */
export const expectedLlmResponseJsonByFindingId: Readonly<Record<string, string>> = {
  'finding-api-key-1': JSON.stringify({
    verdict: 'real_secret',
    confidence: 0.92,
    reasoning: 'Live Stripe-style key assigned to API_KEY in production-looking code.',
  }),
  'finding-fp-1': JSON.stringify({
    verdict: 'false_positive',
    confidence: 0.88,
    reasoning: 'Explicit test fixture string inside a unit test block.',
  }),
  'finding-jwt-1': JSON.stringify({
    verdict: 'uncertain',
    confidence: 0.55,
    reasoning: 'JWT-shaped value but labeled as a sample in comments.',
  }),
};

/** Parsed expected analysis results matching the JSON fixtures above */
export const expectedLlmAnalysisResults: readonly LLMAnalysisResult[] = [
  {
    findingId: 'finding-api-key-1',
    verdict: 'real_secret',
    confidence: 0.92,
    reasoning: 'Live Stripe-style key assigned to API_KEY in production-looking code.',
  },
  {
    findingId: 'finding-fp-1',
    verdict: 'false_positive',
    confidence: 0.88,
    reasoning: 'Explicit test fixture string inside a unit test block.',
  },
  {
    findingId: 'finding-jwt-1',
    verdict: 'uncertain',
    confidence: 0.55,
    reasoning: 'JWT-shaped value but labeled as a sample in comments.',
  },
];

/** Malformed / edge-case LLM response bodies for parser tests */
export const malformedLlmResponses = {
  invalidJson: 'not-json{{{',
  unknownVerdict: JSON.stringify({
    verdict: 'maybe',
    confidence: 0.7,
    reasoning: 'Non-enum verdict',
  }),
  emptyChoicesContent: '',
} as const;
