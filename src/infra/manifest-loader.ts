/**
 * ManifestLoader — loads and validates the bundled model integrity manifest.
 *
 * The model-manifest.json file is imported as a static JSON asset at build time by Vite.
 * This module validates the parsed JSON against the ModelManifest schema and returns a
 * fully-typed result, or throws a descriptive ManifestParseError on validation failure.
 *
 * Usage:
 *   const manifest = loadManifest();
 *   const entry = manifest.models.find(m => m.modelId === 'phi-3.5-mini-4bit');
 */

import type { ModelManifest, ModelManifestEntry, ModelManifestFile } from '@/types/manifest';
import { ManifestParseError } from '@/types/manifest';

// Vite imports JSON as a plain object; typing as `unknown` forces us through validation.
import rawManifest from '@/config/model-manifest.json';

export { ManifestParseError };

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Asserts that a value is a non-null object (but not an Array).
 * Throws {@link ManifestParseError} with a descriptive message on failure.
 */
function assertObject(value: unknown, fieldPath: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ManifestParseError(
      `Expected an object at '${fieldPath}', got ${
        value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
      }`,
      fieldPath
    );
  }
}

/**
 * Asserts that a value is a non-empty string.
 * Throws {@link ManifestParseError} with a descriptive message on failure.
 */
function assertNonEmptyString(value: unknown, fieldPath: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ManifestParseError(
      `Expected a non-empty string at '${fieldPath}', got ${
        value === null ? 'null' : typeof value === 'string' ? 'empty string' : typeof value
      }`,
      fieldPath
    );
  }
}

/**
 * Asserts that a value is a finite, non-negative integer (suitable for sizeBytes).
 * Throws {@link ManifestParseError} with a descriptive message on failure.
 */
function assertNonNegativeInteger(value: unknown, fieldPath: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new ManifestParseError(
      `Expected a non-negative integer at '${fieldPath}', got ${
        typeof value === 'number' ? value : typeof value
      }`,
      fieldPath
    );
  }
}

/**
 * Asserts that a value is an Array.
 * Throws {@link ManifestParseError} with a descriptive message on failure.
 */
function assertArray(value: unknown, fieldPath: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new ManifestParseError(
      `Expected an array at '${fieldPath}', got ${typeof value}`,
      fieldPath
    );
  }
}

// ---------------------------------------------------------------------------
// Per-level validators
// ---------------------------------------------------------------------------

function validateManifestFile(raw: unknown, fieldPath: string): ModelManifestFile {
  assertObject(raw, fieldPath);

  assertNonEmptyString(raw['filename'], `${fieldPath}.filename`);
  assertNonEmptyString(raw['sha256'], `${fieldPath}.sha256`);
  assertNonNegativeInteger(raw['sizeBytes'], `${fieldPath}.sizeBytes`);

  // Validate sha256 looks like a 64-char hex string
  const sha256 = raw['sha256'] as string;
  if (!/^[0-9a-fA-F]{64}$/.test(sha256)) {
    throw new ManifestParseError(
      `Field '${fieldPath}.sha256' must be a 64-character hex string, got '${sha256}'`,
      `${fieldPath}.sha256`
    );
  }

  return {
    filename: raw['filename'] as string,
    sha256: sha256.toLowerCase(),
    sizeBytes: raw['sizeBytes'] as number,
  };
}

function validateManifestEntry(raw: unknown, fieldPath: string): ModelManifestEntry {
  assertObject(raw, fieldPath);

  assertNonEmptyString(raw['modelId'], `${fieldPath}.modelId`);
  assertNonEmptyString(raw['version'], `${fieldPath}.version`);
  assertArray(raw['files'], `${fieldPath}.files`);

  const files = (raw['files'] as unknown[]).map((fileRaw, idx) =>
    validateManifestFile(fileRaw, `${fieldPath}.files[${idx}]`)
  );

  return {
    modelId: raw['modelId'] as string,
    version: raw['version'] as string,
    files,
  };
}

function validateManifest(raw: unknown): ModelManifest {
  assertObject(raw, 'manifest');

  assertNonEmptyString(raw['manifestVersion'], 'manifest.manifestVersion');
  assertArray(raw['models'], 'manifest.models');

  const models = (raw['models'] as unknown[]).map((entryRaw, idx) =>
    validateManifestEntry(entryRaw, `manifest.models[${idx}]`)
  );

  return {
    manifestVersion: raw['manifestVersion'] as string,
    models,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a raw (unknown) JSON value against the ModelManifest schema.
 *
 * Exported for unit testing — callers should use {@link loadManifest} in production code.
 * Extra fields in the JSON are silently ignored (lenient on extras, strict on required).
 *
 * @param raw - The raw JSON value to validate (typically `unknown` from a dynamic import).
 * @returns The validated, typed {@link ModelManifest}.
 * @throws {ManifestParseError} If any required field is missing, has the wrong type,
 *   or contains an invalid value (e.g. a non-hex sha256 string).
 */
export function parseManifest(raw: unknown): ModelManifest {
  return validateManifest(raw);
}

/**
 * Loads and validates the bundled model integrity manifest.
 *
 * The manifest JSON is imported as a static Vite asset at build time. This function
 * validates all required fields and returns a strongly-typed {@link ModelManifest}.
 * Extra fields in the JSON are silently ignored (lenient on extras, strict on required).
 *
 * @returns The validated, typed {@link ModelManifest}.
 * @throws {ManifestParseError} If any required field is missing, has the wrong type,
 *   or contains an invalid value (e.g. a non-hex sha256 string).
 */
export function loadManifest(): ModelManifest {
  return validateManifest(rawManifest as unknown);
}
