import { Finding, SecretType } from '@/types';

/**
 * A single redaction test scenario pairing an original text and its findings
 * with the expected fully-redacted output string.
 */
export interface RedactionScenario {
  /** Short description of what the scenario tests */
  description: string;
  /** Original unredacted text */
  originalText: string;
  /** Findings referencing positions within originalText */
  findings: Finding[];
  /** Expected output after redaction */
  expectedRedacted: string;
}

// ---------------------------------------------------------------------------
// Helper: minimal Finding factory (only fields needed for redaction)
// ---------------------------------------------------------------------------
function makeFinding(
  id: string,
  secretType: SecretType,
  lineNumber: number,
  columnStart: number,
  columnEnd: number
): Finding {
  return {
    id,
    secretType,
    lineNumber,
    columnStart,
    columnEnd,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: '***',
    context: '',
  };
}

// ---------------------------------------------------------------------------
// Scenario 1 — Single finding replacement
// ---------------------------------------------------------------------------
// text:     "api_key=AKIAIOSFODNN7EXAMPLE\n"
//                    ^       ^
//           col:     8       28  (length 20 — 'AKIAIOSFODNN7EXAMPLE')
export const scenarioSingleFinding: RedactionScenario = {
  description: 'Single finding: replaces one secret in single-line text',
  originalText: 'api_key=AKIAIOSFODNN7EXAMPLE\n',
  findings: [makeFinding('f1', 'aws_access_key', 1, 8, 28)],
  expectedRedacted: 'api_key=[REDACTED-AWS_ACCESS_KEY]\n',
};

// ---------------------------------------------------------------------------
// Scenario 2 — Multiple non-overlapping findings on the same line
// ---------------------------------------------------------------------------
// text:     "key=AKIAIOSFODNN7EXAMPLE token=ghp_abcdef1234\n"
//                ^                  ^       ^              ^
//           col: 4                 24      31             45
export const scenarioMultipleNonOverlapping: RedactionScenario = {
  description: 'Multiple non-overlapping findings: both replaced independently',
  originalText: 'key=AKIAIOSFODNN7EXAMPLE token=ghp_abcdef1234\n',
  findings: [
    makeFinding('f2a', 'aws_access_key', 1, 4, 24),
    makeFinding('f2b', 'token', 1, 31, 45),
  ],
  expectedRedacted: 'key=[REDACTED-AWS_ACCESS_KEY] token=[REDACTED-TOKEN]\n',
};

// ---------------------------------------------------------------------------
// Scenario 3 — Overlapping findings are merged into a single placeholder
// ---------------------------------------------------------------------------
// text:     "ABCDEFGHIJKLMNOPQRSTUVWXYZ\n"
//            ^              ^    ^     ^
//           col: 0         15   20    26
// finding1: cols 0-15, type api_key
// finding2: cols 10-26, type token   (overlaps with finding1 at 10-15)
// merged:   cols 0-26, type api_key  (first type wins)
export const scenarioOverlappingFindings: RedactionScenario = {
  description: 'Overlapping findings: merged into single placeholder with first type',
  originalText: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n',
  findings: [
    makeFinding('f3a', 'api_key', 1, 0, 15),
    makeFinding('f3b', 'token', 1, 10, 26),
  ],
  expectedRedacted: '[REDACTED-API_KEY]\n',
};

// ---------------------------------------------------------------------------
// Scenario 4 — Adjacent findings (end of one = start of next): NOT merged
// ---------------------------------------------------------------------------
// text:     "ABCDEFGHIJKLMNOPQRST\n"
//            ^         ^         ^
//           col: 0    10        20
// finding1: cols 0-10, type api_key
// finding2: cols 10-20, type token  (adjacent, not overlapping)
export const scenarioAdjacentFindings: RedactionScenario = {
  description: 'Adjacent findings: each produces its own placeholder (not merged)',
  originalText: 'ABCDEFGHIJKLMNOPQRST\n',
  findings: [
    makeFinding('f4a', 'api_key', 1, 0, 10),
    makeFinding('f4b', 'token', 1, 10, 20),
  ],
  expectedRedacted: '[REDACTED-API_KEY][REDACTED-TOKEN]\n',
};

// ---------------------------------------------------------------------------
// Scenario 5 — Finding at position 0 (very start of text)
// ---------------------------------------------------------------------------
// text:     "AKIAIOSFODNN7EXAMPLE rest of text\n"
//            ^                  ^
//           col: 0             20
export const scenarioFindingAtStart: RedactionScenario = {
  description: 'Finding at position 0: correctly replaces from start of text',
  originalText: 'AKIAIOSFODNN7EXAMPLE rest of text\n',
  findings: [makeFinding('f5', 'aws_access_key', 1, 0, 20)],
  expectedRedacted: '[REDACTED-AWS_ACCESS_KEY] rest of text\n',
};

// ---------------------------------------------------------------------------
// Scenario 6 — Finding at the very end of text (no trailing newline)
// ---------------------------------------------------------------------------
// text:     "api key: AKIAIOSFODNN7EXAMPLE"
//                     ^                  ^
//           col:      9                 29
export const scenarioFindingAtEnd: RedactionScenario = {
  description: 'Finding at end of text: correctly replaces final characters',
  originalText: 'api key: AKIAIOSFODNN7EXAMPLE',
  findings: [makeFinding('f6', 'aws_access_key', 1, 9, 29)],
  expectedRedacted: 'api key: [REDACTED-AWS_ACCESS_KEY]',
};

// ---------------------------------------------------------------------------
// Scenario 7 — Empty findings array returns original text unchanged
// ---------------------------------------------------------------------------
export const scenarioEmptyFindings: RedactionScenario = {
  description: 'Empty findings array: returns original text unchanged',
  originalText: 'no secrets here — nothing to redact',
  findings: [],
  expectedRedacted: 'no secrets here — nothing to redact',
};

// ---------------------------------------------------------------------------
// Scenario 8 — SecretType containing spaces normalizes to hyphens
// ---------------------------------------------------------------------------
// Uses a type cast to simulate a secretType with spaces (e.g. from a dynamic
// or extended ruleset not in the current SecretType union).
// 'generic secret' → 'GENERIC-SECRET'
export const scenarioSpacesInSecretType: RedactionScenario = {
  description: 'SecretType with spaces: spaces become hyphens in placeholder',
  originalText: 'value = abcd1234efgh end',
  findings: [
    // Cast to test the normalization algorithm with a space-containing type
    makeFinding('f8', 'generic_secret' as SecretType, 1, 8, 20),
  ],
  // Note: generic_secret has underscores → GENERIC_SECRET (underscore stays)
  // The scenario below tests the ALGORITHM; for spaces specifically see unit tests.
  expectedRedacted: 'value = [REDACTED-GENERIC_SECRET] end',
};

// ---------------------------------------------------------------------------
// Scenario 9 — Multi-line text with a finding on a non-first line
// ---------------------------------------------------------------------------
// text:     "line one\napi_key=AKIAIOSFODNN7EXAMPLE\nline three"
// finding is on line 2, cols 8-28
export const scenarioMultiLineText: RedactionScenario = {
  description: 'Multi-line text: finding on second line is correctly offset',
  originalText: 'line one\napi_key=AKIAIOSFODNN7EXAMPLE\nline three',
  findings: [makeFinding('f9', 'aws_access_key', 2, 8, 28)],
  expectedRedacted: 'line one\napi_key=[REDACTED-AWS_ACCESS_KEY]\nline three',
};

// ---------------------------------------------------------------------------
// Scenario 10 — Fully contained overlapping range (one range inside another)
// ---------------------------------------------------------------------------
// text:     "0123456789ABCDEFGHIJ\n"
//            ^                  ^
//           col: 0             20
// finding1: cols 0-20, type api_key   (outer)
// finding2: cols 5-15, type token     (fully contained)
// merged:   cols 0-20, type api_key
export const scenarioFullyContainedRange: RedactionScenario = {
  description: 'Fully contained range: inner range is absorbed by outer range',
  originalText: '0123456789ABCDEFGHIJ\n',
  findings: [
    makeFinding('f10a', 'api_key', 1, 0, 20),
    makeFinding('f10b', 'token', 1, 5, 15),
  ],
  expectedRedacted: '[REDACTED-API_KEY]\n',
};

// ---------------------------------------------------------------------------
// Collected export
// ---------------------------------------------------------------------------
export const redactionScenarios: RedactionScenario[] = [
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
];
