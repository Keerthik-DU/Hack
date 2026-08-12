import { describe, it, expect } from 'vitest';
import { redactText, normalizeSecretType } from './redaction-mapper';
import { SecretType } from '@/types';
import {
  scenarioSingleFinding,
  scenarioMultipleNonOverlapping,
  scenarioOverlappingFindings,
  scenarioAdjacentFindings,
  scenarioFindingAtStart,
  scenarioFindingAtEnd,
  scenarioEmptyFindings,
  scenarioSpacesInSecretType,
  scenarioMultiLineText,
  scenarioFullyContainedRange,
} from '@/test/fixtures/redaction-scenarios';

// ---------------------------------------------------------------------------
// normalizeSecretType
// ---------------------------------------------------------------------------
describe('normalizeSecretType', () => {
  it('uppercases a simple underscore-delimited secret type', () => {
    expect(normalizeSecretType('aws_access_key')).toBe('AWS_ACCESS_KEY');
  });

  it('uppercases a single-word secret type', () => {
    expect(normalizeSecretType('token')).toBe('TOKEN');
  });

  it('uppercases and replaces spaces with hyphens', () => {
    expect(normalizeSecretType('high entropy string')).toBe('HIGH-ENTROPY-STRING');
  });

  it('replaces multiple consecutive spaces with a single hyphen', () => {
    // \s+ matches the entire run of whitespace as one token → single hyphen
    expect(normalizeSecretType('github  token')).toBe('GITHUB-TOKEN');
  });

  it('handles an already-uppercase input', () => {
    expect(normalizeSecretType('JWT')).toBe('JWT');
  });

  it('handles mixed case with underscores', () => {
    expect(normalizeSecretType('Database_URL')).toBe('DATABASE_URL');
  });
});

// ---------------------------------------------------------------------------
// redactText — fixture-driven scenarios
// ---------------------------------------------------------------------------
describe('redactText — fixture scenarios', () => {
  it('Scenario 1: replaces a single finding', () => {
    const { originalText, findings, expectedRedacted } = scenarioSingleFinding;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 2: replaces multiple non-overlapping findings', () => {
    const { originalText, findings, expectedRedacted } = scenarioMultipleNonOverlapping;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 3: merges overlapping findings into one placeholder', () => {
    const { originalText, findings, expectedRedacted } = scenarioOverlappingFindings;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 4: keeps adjacent findings as separate placeholders', () => {
    const { originalText, findings, expectedRedacted } = scenarioAdjacentFindings;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 5: handles a finding at position 0', () => {
    const { originalText, findings, expectedRedacted } = scenarioFindingAtStart;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 6: handles a finding at the end of text', () => {
    const { originalText, findings, expectedRedacted } = scenarioFindingAtEnd;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 7: returns original text unchanged when findings is empty', () => {
    const { originalText, findings, expectedRedacted } = scenarioEmptyFindings;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 8: handles existing secret types with underscores', () => {
    const { originalText, findings, expectedRedacted } = scenarioSpacesInSecretType;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 9: correctly offsets findings on non-first lines', () => {
    const { originalText, findings, expectedRedacted } = scenarioMultiLineText;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });

  it('Scenario 10: absorbs a fully-contained inner range', () => {
    const { originalText, findings, expectedRedacted } = scenarioFullyContainedRange;
    expect(redactText(originalText, findings)).toBe(expectedRedacted);
  });
});

// ---------------------------------------------------------------------------
// redactText — explicit space-normalization test
// ---------------------------------------------------------------------------
describe('redactText — secretType with spaces', () => {
  it('normalizes a space-containing secretType to hyphens in the placeholder', () => {
    const text = 'prefix SECRETVALUE suffix';
    const result = redactText(text, [
      {
        id: 'test-spaces',
        // Cast to simulate a dynamically-typed secretType with spaces
        secretType: 'high entropy string' as unknown as SecretType,
        lineNumber: 1,
        columnStart: 7,
        columnEnd: 18,
        confidence: 'medium',
        detectionLayer: 2,
        maskedValue: '***',
        context: text,
      },
    ]);
    expect(result).toBe('prefix [REDACTED-HIGH-ENTROPY-STRING] suffix');
  });
});

// ---------------------------------------------------------------------------
// redactText — edge cases
// ---------------------------------------------------------------------------
describe('redactText — edge cases', () => {
  it('returns original text when originalText is empty string', () => {
    expect(redactText('', [])).toBe('');
  });

  it('returns original text when originalText is empty even with findings', () => {
    const finding = {
      id: 'f',
      secretType: 'token' as SecretType,
      lineNumber: 1,
      columnStart: 0,
      columnEnd: 5,
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText('', [finding])).toBe('');
  });

  it('silently skips findings with lineNumber exceeding line count', () => {
    const text = 'single line';
    const finding = {
      id: 'f',
      secretType: 'token' as SecretType,
      lineNumber: 5, // beyond line count
      columnStart: 0,
      columnEnd: 6,
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText(text, [finding])).toBe(text);
  });

  it('silently skips findings where columnStart >= columnEnd', () => {
    const text = 'some text';
    const finding = {
      id: 'f',
      secretType: 'token' as SecretType,
      lineNumber: 1,
      columnStart: 5,
      columnEnd: 5, // zero-width range
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText(text, [finding])).toBe(text);
  });

  it('handles multi-line text with \\r\\n line endings', () => {
    // Windows-style line endings
    const text = 'line one\r\nsecret=TOKEN_VALUE\r\nline three';
    // "line one\r\n" = 10 chars → line 2 starts at offset 10
    // "secret=" = 7 chars → col 0-6 of line 2
    // "TOKEN_VALUE" = 11 chars → cols 7-17 of line 2
    const finding = {
      id: 'f',
      secretType: 'token' as SecretType,
      lineNumber: 2,
      columnStart: 7,
      columnEnd: 18,
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText(text, [finding])).toBe('line one\r\nsecret=[REDACTED-TOKEN]\r\nline three');
  });

  it('handles a finding that spans the entire text', () => {
    const text = 'SECRETVALUE';
    const finding = {
      id: 'f',
      secretType: 'generic_secret' as SecretType,
      lineNumber: 1,
      columnStart: 0,
      columnEnd: 11,
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText(text, [finding])).toBe('[REDACTED-GENERIC_SECRET]');
  });

  it('does not accidentally redact literal "[REDACTED-" strings in the source text', () => {
    // The source text already contains a placeholder-looking string, but redaction
    // only operates on the explicit finding character ranges — not pattern matches.
    // "see [REDACTED-TOKEN] and AKIAIOSFODNN7EXAMPLE"
    //                          ^                    ^
    //  col:                   25                   45
    const text = 'see [REDACTED-TOKEN] and AKIAIOSFODNN7EXAMPLE';
    const finding = {
      id: 'f',
      secretType: 'aws_access_key' as SecretType,
      lineNumber: 1,
      columnStart: 25, // start of 'AKIAIOSFODNN7EXAMPLE'
      columnEnd: 45,   // end (exclusive)
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    };
    expect(redactText(text, [finding])).toBe(
      'see [REDACTED-TOKEN] and [REDACTED-AWS_ACCESS_KEY]'
    );
  });

  it('processes three overlapping ranges correctly', () => {
    // Three findings that all partially overlap
    // text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    // f1: 0-10 (api_key)
    // f2: 5-15 (token)
    // f3: 12-22 (jwt)
    // merged: 0-22 (api_key)
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = redactText(text, [
      {
        id: 'f1',
        secretType: 'api_key' as SecretType,
        lineNumber: 1,
        columnStart: 0,
        columnEnd: 10,
        confidence: 'high' as const,
        detectionLayer: 1 as const,
        maskedValue: '***',
        context: '',
      },
      {
        id: 'f2',
        secretType: 'token' as SecretType,
        lineNumber: 1,
        columnStart: 5,
        columnEnd: 15,
        confidence: 'high' as const,
        detectionLayer: 1 as const,
        maskedValue: '***',
        context: '',
      },
      {
        id: 'f3',
        secretType: 'jwt' as SecretType,
        lineNumber: 1,
        columnStart: 12,
        columnEnd: 22,
        confidence: 'high' as const,
        detectionLayer: 1 as const,
        maskedValue: '***',
        context: '',
      },
    ]);
    expect(result).toBe('[REDACTED-API_KEY]WXYZ');
  });
});

// ---------------------------------------------------------------------------
// redactText — performance test
// ---------------------------------------------------------------------------
describe('redactText — performance', () => {
  it('completes in under 100ms for 100K character input with 50 findings', () => {
    // Build a 100K character text with 50 "secret" tokens of 20 chars each
    const SECRET = 'AKIAIOSFODNN7EXAMPLE'; // 20 chars
    const SEPARATOR = 'x'.repeat(1980);    // 1980 chars of filler
    // Each chunk = 2000 chars (20 secret + 1980 filler), 50 chunks = 100K chars
    const chunks: string[] = [];
    for (let i = 0; i < 50; i++) {
      chunks.push(SECRET + SEPARATOR);
    }
    const bigText = chunks.join('');
    expect(bigText.length).toBe(100000);

    // Create 50 findings, one per line (single-line text for simplicity)
    // In a single-line text, all findings are on line 1 at their respective column offsets
    const findings = Array.from({ length: 50 }, (_, i) => ({
      id: `perf-${i}`,
      secretType: 'aws_access_key' as SecretType,
      lineNumber: 1,
      columnStart: i * 2000,
      columnEnd: i * 2000 + 20,
      confidence: 'high' as const,
      detectionLayer: 1 as const,
      maskedValue: '***',
      context: '',
    }));

    const start = performance.now();
    const result = redactText(bigText, findings);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(result).toContain('[REDACTED-AWS_ACCESS_KEY]');
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });
});
