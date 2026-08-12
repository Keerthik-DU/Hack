import type { AmbiguousFinding } from '@/types/llm-types';

/**
 * Sample ambiguous findings with ±5 context lines for LLM worker tests.
 */
export const ambiguousApiKeyFinding: AmbiguousFinding = {
  id: 'finding-api-key-1',
  secretType: 'api_key',
  lineNumber: 12,
  columnStart: 16,
  columnEnd: 48,
  confidence: 'medium',
  detectionLayer: 2,
  maskedValue: 'sk_live_************************',
  context: 'const API_KEY = "sk_live_************************";',
  entropyScore: 4.6,
  candidates: ['api_key', 'generic_secret'],
  contextLines: [
    'import express from "express";',
    'const app = express();',
    '',
    '// Production credentials — do not commit',
    'const API_KEY = "sk_live_EXAMPLE_NOT_A_REAL_SECRET_VALUE";',
    'app.listen(3000);',
    '',
    'export default app;',
  ],
};

export const ambiguousFalsePositiveFinding: AmbiguousFinding = {
  id: 'finding-fp-1',
  secretType: 'generic_secret',
  lineNumber: 4,
  columnStart: 10,
  columnEnd: 42,
  confidence: 'medium',
  detectionLayer: 2,
  maskedValue: 'EXAMPLE_************************',
  context: 'const example = "EXAMPLE_TEST_KEY_NOT_REAL";',
  entropyScore: 3.9,
  candidates: ['generic_secret', 'token'],
  contextLines: [
    '// Unit test fixture data',
    'describe("auth", () => {',
    '  it("rejects invalid keys", () => {',
    '    const example = "EXAMPLE_TEST_KEY_NOT_REAL";',
    '    expect(validate(example)).toBe(false);',
    '  });',
    '});',
  ],
};

export const ambiguousJwtFinding: AmbiguousFinding = {
  id: 'finding-jwt-1',
  secretType: 'jwt',
  lineNumber: 8,
  columnStart: 12,
  columnEnd: 80,
  confidence: 'low',
  detectionLayer: 2,
  maskedValue: 'eyJhbGciOi****************',
  context: 'const token = "eyJhbGciOi****************";',
  entropyScore: 5.1,
  candidates: ['jwt', 'token'],
  contextLines: [
    'function getSession() {',
    '  // unclear whether this is a sample or live token',
    '  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.sig";',
    '  return token;',
    '}',
  ],
};

export const sampleAmbiguousFindings: readonly AmbiguousFinding[] = [
  ambiguousApiKeyFinding,
  ambiguousFalsePositiveFinding,
  ambiguousJwtFinding,
];
