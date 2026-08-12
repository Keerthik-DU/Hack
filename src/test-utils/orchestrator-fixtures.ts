import type { Finding } from '@/types';

/** Multi-line sample used for progressive three-layer pipeline tests. */
export const ORCHESTRATOR_SAMPLE_INPUT = [
  'line-1',
  'line-2',
  'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
  'line-4',
  'const maybe = "a".repeat(40);',
  'line-6',
  'const token = "lowconf_token_value_xx";',
  'line-8',
  'line-9',
  'line-10',
  'last-line',
].join('\n');

export const HIGH_CONFIDENCE_REGEX: Finding = {
  id: 'regex-high-1',
  secretType: 'aws_access_key',
  lineNumber: 3,
  columnStart: 18,
  columnEnd: 38,
  confidence: 'high',
  detectionLayer: 1,
  maskedValue: 'AKIA***MPLE',
  context: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
};

export const MEDIUM_CONFIDENCE_REGEX: Finding = {
  id: 'regex-med-1',
  secretType: 'token',
  lineNumber: 7,
  columnStart: 16,
  columnEnd: 36,
  confidence: 'medium',
  detectionLayer: 1,
  maskedValue: 'lowc***_xx',
  context: 'const token = "lowconf_token_value_xx";',
};

export const MEDIUM_CONFIDENCE_ENTROPY: Finding = {
  id: 'entropy-med-1',
  secretType: 'high_entropy_string',
  lineNumber: 5,
  columnStart: 15,
  columnEnd: 55,
  confidence: 'medium',
  detectionLayer: 3,
  maskedValue: 'aaaa***aaaa',
  context: 'const maybe = "a".repeat(40);',
};

export const LOW_CONFIDENCE_ENTROPY: Finding = {
  id: 'entropy-low-1',
  secretType: 'generic_secret',
  lineNumber: 7,
  columnStart: 16,
  columnEnd: 36,
  confidence: 'low',
  detectionLayer: 3,
  maskedValue: 'lowc***_xx',
  context: 'const token = "lowconf_token_value_xx";',
};

/** LLM upgrades the medium regex finding and downgrades the overlapping low entropy hit. */
export const LLM_UPGRADED_MEDIUM: Finding = {
  ...MEDIUM_CONFIDENCE_REGEX,
  id: 'llm-up-1',
  confidence: 'high',
  detectionLayer: 2,
};

export const LLM_DOWNGRADED_LOW: Finding = {
  ...LOW_CONFIDENCE_ENTROPY,
  id: 'llm-down-1',
  confidence: 'low',
  detectionLayer: 2,
  secretType: 'generic_secret',
};

/** Expected progressive stage markers for documentation/assertions. */
export const EXPECTED_PROGRESSIVE_STAGES = [
  'Initializing scan pipeline',
  'Layer 1',
  'Layer 3',
  'Layer 2',
  'Scan complete',
] as const;
