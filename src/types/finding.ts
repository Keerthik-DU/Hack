/**
 * Secret classification type detected by AirGap Scanner.
 */
export type SecretType =
  | 'api_key'
  | 'aws_access_key'
  | 'private_key'
  | 'jwt'
  | 'generic_secret'
  | 'database_url'
  | 'token'
  | 'high_entropy_string';

/**
 * Confidence level of secret detection.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Detection layer level (1: Regex, 2: Entropy, 3: LLM).
 */
export type DetectionLayer = 1 | 2 | 3;

/**
 * Core interface representing a detected secret finding.
 * Note: `rawValue` is typed as `never` to enforce zero storage of unmasked raw secret values.
 */
export interface Finding {
  /** Unique identifier for the finding */
  readonly id: string;
  /** Categorized secret type */
  readonly secretType: SecretType;
  /** Line number in source text (1-indexed) */
  readonly lineNumber: number;
  /** Column start index in line (0-indexed) */
  readonly columnStart: number;
  /** Column end index in line (0-indexed) */
  readonly columnEnd: number;
  /** Confidence score category */
  readonly confidence: ConfidenceLevel;
  /** Engine layer level that produced finding */
  readonly detectionLayer: DetectionLayer;
  /** Redacted / masked value safe for display */
  readonly maskedValue: string;
  /** Surrounding text snippet context */
  readonly context: string;
  /** Raw secret value is explicitly forbidden */
  readonly rawValue?: never;
}

/**
 * Finding with candidate secret classifications produced by Entropy or LLM analyzers.
 */
export interface AmbiguousFinding extends Finding {
  /** Entropy score or probability list */
  readonly entropyScore?: number;
  /** Candidate secret types when classification is ambiguous */
  readonly candidates?: readonly SecretType[];
}
