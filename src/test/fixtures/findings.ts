import { Finding } from '@/types';

// ─── Verdict scenario fixtures ────────────────────────────────────────────────
// Used by VerdictBanner tests to cover every boundary case.

export const verdictZeroFindings = {
  count: 0,
  scanStatus: 'complete' as const,
};

export const verdictOneFinding = {
  count: 1,
  scanStatus: 'complete' as const,
};

export const verdictFiveFindings = {
  count: 5,
  scanStatus: 'complete' as const,
};

export const verdictSixFindings = {
  count: 6,
  scanStatus: 'complete' as const,
};

export const verdictTwentyFindings = {
  count: 20,
  scanStatus: 'complete' as const,
};

// ─── Sample Finding objects ───────────────────────────────────────────────────

export const sampleFindings: Finding[] = [
  {
    id: 'finding-aws-high',
    secretType: 'aws_access_key',
    lineNumber: 12,
    columnStart: 8,
    columnEnd: 28,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: 'AKIA***KEY1',
    context: 'const awsKey = "AKIA***KEY1";',
  },
  {
    id: 'finding-jwt-medium',
    secretType: 'jwt',
    lineNumber: 4,
    columnStart: 14,
    columnEnd: 58,
    confidence: 'medium',
    detectionLayer: 2,
    maskedValue: 'eyJh***QifQ',
    context: 'const token = "eyJh***QifQ";',
  },
  {
    id: 'finding-private-low',
    secretType: 'private_key',
    lineNumber: 1,
    columnStart: 0,
    columnEnd: 5,
    confidence: 'low',
    detectionLayer: 3,
    maskedValue: '-----***----',
    context: '-----BEGIN *** PRIVATE KEY ***',
  },
  {
    id: 'finding-db-high',
    secretType: 'database_url',
    lineNumber: 88,
    columnStart: 3,
    columnEnd: 63,
    confidence: 'high',
    detectionLayer: 2,
    maskedValue: 'post***prod',
    context: 'DATABASE_URL=post***prod',
  },
  {
    id: 'finding-token-medium',
    secretType: 'token',
    lineNumber: 0,
    columnStart: 1,
    columnEnd: 9,
    confidence: 'medium',
    detectionLayer: 1,
    maskedValue: 'abcd123',
    context: 'token=abcd123',
  },
  {
    id: 'finding-entropy-low',
    secretType: 'high_entropy_string',
    lineNumber: 120,
    columnStart: 12,
    columnEnd: 84,
    confidence: 'low',
    detectionLayer: 3,
    maskedValue: 'rand***5678',
    context: 'const seed = "rand***5678";',
  },
];