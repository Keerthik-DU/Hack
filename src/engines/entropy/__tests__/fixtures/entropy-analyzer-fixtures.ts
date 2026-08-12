import { EngineInput } from '../../../types';

export interface EntropyAnalyzerFixture {
  id: string;
  description: string;
  input: EngineInput;
  expectedFindingCount: number;
  expectedMinConfidence?: 'high' | 'medium';
}

export const REALISTIC_ENGINE_INPUT_FIXTURES: EntropyAnalyzerFixture[] = [
  {
    id: 'code-snippet-3-secrets-5-non-secrets',
    description: 'Multi-line code snippet with 3 high-entropy secrets and 5 non-secrets',
    input: {
      text: `
// Configuration
const appName = "AirGapScannerDashboardApplication";
const maxRetryCount = 10;
const loopCounterIndex = "loopCounterIndexIdentifier";

// Sensitive Credentials
const awsApiKey = "AKIA1234567890ABCDEF9876543210GHIJKL";
const dbSecretToken = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY9876543210XYZ";
const userSessionId = "550e8400-e29b-41d4-a716-446655440000";

// Normal Code
function calculateTotal(a, b) {
  return a + b;
}
      `,
    },
    expectedFindingCount: 2, // awsApiKey and dbSecretToken (userSessionId is UUID hex below threshold/filtered)
    expectedMinConfidence: 'high',
  },
  {
    id: 'natural-language-text',
    description: 'Natural language text paragraph',
    input: {
      text: 'The quick brown fox jumps over the lazy dog in the sunny meadow near the old castle wall.',
    },
    expectedFindingCount: 0,
  },
  {
    id: 'random-hex-no-context',
    description: 'Random 40-character hex string assigned to loopCounter',
    input: {
      text: 'const loopCounter = "a1b2c3d4e5f678901234567890abcdef12345678";',
    },
    expectedFindingCount: 1,
    expectedMinConfidence: 'medium',
  },
];
