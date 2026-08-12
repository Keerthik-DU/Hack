import { Finding } from '@/types';

export const SAMPLE_AWS_FINDING: Finding = {
  id: 'sample-aws-1',
  secretType: 'aws_access_key',
  lineNumber: 1,
  columnStart: 18,
  columnEnd: 38,
  confidence: 'high',
  detectionLayer: 1,
  maskedValue: 'AKIA***KEY1',
  context: 'const awsKey = "AKIA1234567890EXAMPLEKEY1";',
};

export const SAMPLE_ENTROPY_FINDING: Finding = {
  id: 'sample-entropy-1',
  secretType: 'high_entropy_string',
  lineNumber: 2,
  columnStart: 15,
  columnEnd: 55,
  confidence: 'medium',
  detectionLayer: 3,
  maskedValue: 'dop_***cdef',
  context: 'const token = "dop_v1_1234567890abcdef1234567890abcdef";',
};

export const SAMPLE_LLM_FINDING: Finding = {
  id: 'sample-llm-1',
  secretType: 'generic_secret',
  lineNumber: 2,
  columnStart: 15,
  columnEnd: 55,
  confidence: 'high',
  detectionLayer: 2,
  maskedValue: 'dop_***cdef',
  context: 'const token = "dop_v1_1234567890abcdef1234567890abcdef";',
};

export const SAMPLE_INPUT_CLEAN = 'function helloWorld() {\n  return "Hello World";\n}';
export const SAMPLE_INPUT_AWS = 'const awsKey = "AKIA1234567890EXAMPLEKEY1";';
export const SAMPLE_INPUT_MULTI_SECRET =
  'const awsKey = "AKIA1234567890EXAMPLEKEY1";\nconst token = "dop_v1_1234567890abcdef1234567890abcdef";';

export const SAMPLE_INPUT_10K = 'a'.repeat(10000);
export const SAMPLE_INPUT_100K = 'b'.repeat(100000);
