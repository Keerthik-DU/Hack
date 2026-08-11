import { SecretType, ConfidenceLevel, DetectionLayer } from '@/types';

/**
 * Expected finding structure in test fixture definitions.
 */
export interface ExpectedFinding {
  readonly secretType: SecretType;
  readonly lineNumber: number;
  readonly confidence: ConfidenceLevel;
  readonly detectionLayer?: DetectionLayer;
  readonly maskedValueSnippet?: string;
}

/**
 * Labeled test case schema for secret detection engine evaluation.
 */
export interface TestFixture {
  /** Unique test case identifier */
  readonly id: string;
  /** Human-readable scenario description */
  readonly description: string;
  /** Source text content to scan (code, logs, config) */
  readonly input: string;
  /** Array of expected findings that must be detected */
  readonly expectedFindings: readonly ExpectedFinding[];
  /** Substrings or patterns that should NOT be flagged as secrets */
  readonly falsePositives: readonly string[];
  /** Metadata describing origin and categorization */
  readonly metadata: {
    readonly source: string;
    readonly category: string;
  };
}
