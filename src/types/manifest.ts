/**
 * Type definitions for the model integrity manifest and SHA-256 verification results.
 * Used by HashVerifier and ManifestLoader for supply chain integrity checks (OWASP A03 / A08).
 */

/**
 * A single file entry within a model manifest.
 * Each file in a model release is listed with its expected SHA-256 hash and size.
 */
export interface ModelManifestFile {
  /** Filename (e.g. 'weights.bin', 'tokenizer.json') */
  readonly filename: string;
  /** Lowercase hex-encoded SHA-256 hash of the file contents */
  readonly sha256: string;
  /** Expected file size in bytes (used for quick size-mismatch early exit) */
  readonly sizeBytes: number;
}

/**
 * A single model entry in the manifest, grouping all files for one model release.
 */
export interface ModelManifestEntry {
  /** Unique model identifier matching the identifier used in ModelCacheEntry (e.g. 'phi-3.5-mini-4bit') */
  readonly modelId: string;
  /** Semantic version string (e.g. 'v1.2.0') */
  readonly version: string;
  /** All files that make up this model release */
  readonly files: ModelManifestFile[];
}

/**
 * The top-level model manifest structure bundled with the application at build time.
 * Populated by the CI/CD pipeline during the build stage using known-good model hashes.
 */
export interface ModelManifest {
  /** Manifest schema version for forward-compatibility (e.g. '1.0.0') */
  readonly manifestVersion: string;
  /** All model releases tracked in this manifest */
  readonly models: ModelManifestEntry[];
}

/**
 * Result of a SHA-256 integrity verification operation.
 * Returned by HashVerifier.verify() regardless of pass/fail outcome.
 */
export interface VerificationResult {
  /** Whether the computed hash matches the expected hash */
  readonly valid: boolean;
  /** Lowercase hex-encoded SHA-256 hash actually computed from the data */
  readonly computedHash: string;
  /** The expected hash provided by the caller (normalized to lowercase) */
  readonly expectedHash: string;
  /** Wall-clock milliseconds elapsed during hash computation */
  readonly verificationTimeMs: number;
  /** Error message if hash computation failed; only present on failure */
  readonly error?: string;
}

/**
 * Typed error thrown by HashVerifier when crypto.subtle is unavailable
 * or when the underlying digest operation fails.
 */
export class HashComputationError extends Error {
  /** Discriminant for safe narrowing in callers */
  readonly kind = 'HashComputationError' as const;

  constructor(
    message: string,
    /** Original cause, if available */
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'HashComputationError';
  }
}

/**
 * Typed error thrown by loadManifest() when the manifest JSON is missing
 * required fields or has an unexpected structure.
 */
export class ManifestParseError extends Error {
  /** Discriminant for safe narrowing in callers */
  readonly kind = 'ManifestParseError' as const;

  constructor(
    message: string,
    /** The field path that failed validation (e.g. 'models[0].files[1].sha256') */
    readonly fieldPath?: string
  ) {
    super(message);
    this.name = 'ManifestParseError';
  }
}
