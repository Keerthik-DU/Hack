import type { AmbiguousFinding, LLMAnalysisResult } from '@/types/llm-types';
import type { Finding } from '@/types/finding';
import type { ResultMessage } from '@/types/worker-messages';
import {
  ambiguousApiKeyFinding,
  ambiguousFalsePositiveFinding,
  sampleAmbiguousFindings,
} from '@/workers/__tests__/fixtures/ambiguous-findings';
import { expectedLlmAnalysisResults } from '@/workers/__tests__/fixtures/expected-llm-responses';

export { sampleAmbiguousFindings, ambiguousApiKeyFinding, ambiguousFalsePositiveFinding };

/** Expected RESULT payload after successful LLM analysis of the sample ambiguous set. */
export const expectedResultPayload: ResultMessage = {
  type: 'RESULT',
  findings: [
    {
      id: 'finding-api-key-1',
      secretType: 'api_key',
      lineNumber: 12,
      columnStart: 16,
      columnEnd: 48,
      confidence: 'high',
      detectionLayer: 2,
      maskedValue: 'sk_live_************************',
      context: 'const API_KEY = "sk_live_************************";',
    },
    {
      id: 'finding-fp-1',
      secretType: 'generic_secret',
      lineNumber: 4,
      columnStart: 10,
      columnEnd: 42,
      confidence: 'low',
      detectionLayer: 2,
      maskedValue: 'EXAMPLE_************************',
      context: 'const example = "EXAMPLE_TEST_KEY_NOT_REAL";',
    },
    {
      id: 'finding-jwt-1',
      secretType: 'jwt',
      lineNumber: 8,
      columnStart: 12,
      columnEnd: 80,
      confidence: 'medium',
      detectionLayer: 2,
      maskedValue: 'eyJhbGciOi****************',
      context: 'const token = "eyJhbGciOi****************";',
    },
  ],
  analysisResults: expectedLlmAnalysisResults as readonly LLMAnalysisResult[],
};

/** Original findings unchanged (timeout / pass-through baseline). */
export function asFindings(findings: readonly AmbiguousFinding[]): Finding[] {
  return findings.map(({ contextLines: _c, entropyScore: _e, candidates: _cand, ...rest }) => rest);
}
