/**
 * Unit tests for manifest-loader.
 *
 * Coverage:
 *   - loadManifest(): returns a valid ModelManifest for the bundled placeholder manifest
 *   - parseManifest(): accepts a well-formed manifest object
 *   - parseManifest(): throws ManifestParseError for missing manifestVersion
 *   - parseManifest(): throws ManifestParseError for missing models array
 *   - parseManifest(): throws ManifestParseError for models that is not an array
 *   - parseManifest(): throws ManifestParseError for a model entry missing modelId
 *   - parseManifest(): throws ManifestParseError for a model entry missing version
 *   - parseManifest(): throws ManifestParseError for a file entry missing filename
 *   - parseManifest(): throws ManifestParseError for a file entry missing sha256
 *   - parseManifest(): throws ManifestParseError for a file entry with invalid sha256 format
 *   - parseManifest(): throws ManifestParseError for a file entry with negative sizeBytes
 *   - parseManifest(): is lenient on extra/unknown fields
 *   - parseManifest(): normalizes sha256 to lowercase
 *   - parseManifest(): handles an empty models array
 *   - parseManifest(): throws ManifestParseError for non-object input
 */

import { describe, it, expect } from 'vitest';

import { loadManifest, parseManifest, ManifestParseError } from '../manifest-loader';
import {
  VALID_MANIFEST,
  MULTI_MODEL_MANIFEST,
  MANIFEST_MISSING_VERSION,
  MANIFEST_BAD_SHA256,
  MANIFEST_MODELS_NOT_ARRAY,
} from '@/test-utils/hash-fixtures';

// ---------------------------------------------------------------------------
// loadManifest (bundled JSON)
// ---------------------------------------------------------------------------

describe('loadManifest()', () => {
  it('returns a ModelManifest from the bundled placeholder manifest without throwing', () => {
    expect(() => loadManifest()).not.toThrow();
  });

  it('returns an object with manifestVersion string', () => {
    const manifest = loadManifest();
    expect(typeof manifest.manifestVersion).toBe('string');
    expect(manifest.manifestVersion.length).toBeGreaterThan(0);
  });

  it('returns an object with a models array', () => {
    const manifest = loadManifest();
    expect(Array.isArray(manifest.models)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseManifest — valid inputs
// ---------------------------------------------------------------------------

describe('parseManifest() — valid inputs', () => {
  it('parses a well-formed manifest and returns the correct manifestVersion', () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.manifestVersion).toBe('1.0.0');
  });

  it('parses a well-formed manifest and returns the correct model count', () => {
    const result = parseManifest(VALID_MANIFEST);
    expect(result.models).toHaveLength(1);
  });

  it('parses model entries with correct modelId and version', () => {
    const result = parseManifest(VALID_MANIFEST);
    const entry = result.models[0];
    expect(entry.modelId).toBe('phi-3.5-mini-4bit');
    expect(entry.version).toBe('v1.2.0');
  });

  it('parses file entries with correct fields', () => {
    const result = parseManifest(VALID_MANIFEST);
    const file = result.models[0].files[0];
    expect(file.filename).toBe('weights.bin');
    expect(file.sha256).toBe('a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789');
    expect(file.sizeBytes).toBe(314572800);
  });

  it('handles multiple models in the manifest', () => {
    const result = parseManifest(MULTI_MODEL_MANIFEST);
    expect(result.models).toHaveLength(2);
    expect(result.models[1].modelId).toBe('tinyllama-1b-4bit');
  });

  it('handles an empty models array', () => {
    const result = parseManifest({ manifestVersion: '1.0.0', models: [] });
    expect(result.models).toHaveLength(0);
  });

  it('normalizes uppercase sha256 to lowercase', () => {
    const manifestWithUpperCase = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [
            {
              filename: 'weights.bin',
              sha256: 'A3F1D2C4B5E60789A3F1D2C4B5E60789A3F1D2C4B5E60789A3F1D2C4B5E60789',
              sizeBytes: 1024,
            },
          ],
        },
      ],
    };

    const result = parseManifest(manifestWithUpperCase);
    expect(result.models[0].files[0].sha256).toBe(
      'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789'
    );
  });

  it('is lenient on extra/unknown top-level fields', () => {
    const manifestWithExtra = {
      manifestVersion: '1.0.0',
      models: [],
      _comment: 'This is a comment field',
      generatedBy: 'CI pipeline',
      buildTimestamp: '2026-08-12T00:00:00Z',
    };

    expect(() => parseManifest(manifestWithExtra)).not.toThrow();
    const result = parseManifest(manifestWithExtra);
    expect(result.manifestVersion).toBe('1.0.0');
  });

  it('is lenient on extra fields in model entries', () => {
    const manifestWithExtraModelFields = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [],
          downloadUrl: 'https://cdn.example.com/model.bin',
          description: 'A test model',
        },
      ],
    };

    expect(() => parseManifest(manifestWithExtraModelFields)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseManifest — invalid inputs
// ---------------------------------------------------------------------------

describe('parseManifest() — invalid inputs', () => {
  it('throws ManifestParseError when manifestVersion is missing', () => {
    expect(() => parseManifest(MANIFEST_MISSING_VERSION)).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError with a message mentioning manifestVersion', () => {
    expect(() => parseManifest(MANIFEST_MISSING_VERSION)).toThrow(/manifestVersion/);
  });

  it('throws ManifestParseError when models is not an array', () => {
    expect(() => parseManifest(MANIFEST_MODELS_NOT_ARRAY)).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError with a message mentioning models when not an array', () => {
    expect(() => parseManifest(MANIFEST_MODELS_NOT_ARRAY)).toThrow(/models/);
  });

  it('throws ManifestParseError when sha256 is not 64 hex characters', () => {
    expect(() => parseManifest(MANIFEST_BAD_SHA256)).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError with a message mentioning sha256 format', () => {
    expect(() => parseManifest(MANIFEST_BAD_SHA256)).toThrow(/sha256/);
  });

  it('throws ManifestParseError when a model entry is missing modelId', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          version: 'v1.0.0',
          files: [],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
    expect(() => parseManifest(manifest)).toThrow(/modelId/);
  });

  it('throws ManifestParseError when a model entry is missing version', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          files: [],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
    expect(() => parseManifest(manifest)).toThrow(/version/);
  });

  it('throws ManifestParseError when a file entry is missing filename', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [
            {
              sha256: 'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789',
              sizeBytes: 1024,
            },
          ],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
    expect(() => parseManifest(manifest)).toThrow(/filename/);
  });

  it('throws ManifestParseError when a file entry is missing sha256', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [
            {
              filename: 'weights.bin',
              sizeBytes: 1024,
            },
          ],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
    expect(() => parseManifest(manifest)).toThrow(/sha256/);
  });

  it('throws ManifestParseError when sizeBytes is negative', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [
            {
              filename: 'weights.bin',
              sha256: 'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789',
              sizeBytes: -1,
            },
          ],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
    expect(() => parseManifest(manifest)).toThrow(/sizeBytes/);
  });

  it('throws ManifestParseError when sizeBytes is a non-integer float', () => {
    const manifest = {
      manifestVersion: '1.0.0',
      models: [
        {
          modelId: 'test-model',
          version: 'v1.0.0',
          files: [
            {
              filename: 'weights.bin',
              sha256: 'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789',
              sizeBytes: 1024.5,
            },
          ],
        },
      ],
    };
    expect(() => parseManifest(manifest)).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError when input is null', () => {
    expect(() => parseManifest(null)).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError when input is an array instead of an object', () => {
    expect(() => parseManifest([])).toThrow(ManifestParseError);
  });

  it('throws ManifestParseError when input is a string', () => {
    expect(() => parseManifest('{"manifestVersion":"1.0.0"}')).toThrow(ManifestParseError);
  });

  it('ManifestParseError has the correct kind discriminant', () => {
    try {
      parseManifest(MANIFEST_MISSING_VERSION);
      expect.fail('Expected ManifestParseError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestParseError);
      expect((err as ManifestParseError).kind).toBe('ManifestParseError');
    }
  });

  it('ManifestParseError includes fieldPath for missing fields', () => {
    try {
      parseManifest(MANIFEST_MISSING_VERSION);
      expect.fail('Expected ManifestParseError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestParseError);
      expect((err as ManifestParseError).fieldPath).toBe('manifest.manifestVersion');
    }
  });
});
