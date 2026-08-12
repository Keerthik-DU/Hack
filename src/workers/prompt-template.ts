import type { AmbiguousFinding } from '@/types/llm-types';

/**
 * Static system prompt instructing the model to act as a local secret-detection expert
 * and return structured JSON only.
 */
export function buildSystemPrompt(): string {
  return [
    'You are a secret detection expert running entirely inside a local browser Web Worker.',
    'Your job is to decide whether a flagged string is a real secret, a false positive, or uncertain.',
    'Use only the flagged value details and the provided surrounding context lines.',
    'Do not invent additional source files or credentials.',
    'Respond with a single JSON object only — no markdown fences, no prose outside JSON.',
    'JSON schema:',
    '{"verdict":"real_secret"|"false_positive"|"uncertain","confidence":number,"reasoning":string}',
    'confidence must be a number between 0 and 1 inclusive.',
  ].join(' ');
}

/**
 * Builds the per-finding user prompt including masked value, metadata, and context lines.
 */
export function buildUserPrompt(finding: AmbiguousFinding): string {
  const contextBlock =
    finding.contextLines.length > 0
      ? finding.contextLines.map((line, index) => `${index + 1}| ${line}`).join('\n')
      : '(no context lines provided)';

  const candidates =
    finding.candidates && finding.candidates.length > 0
      ? finding.candidates.join(', ')
      : 'none';

  return [
    'Analyze the following ambiguous secret finding.',
    '',
    `findingId: ${finding.id}`,
    `secretType: ${finding.secretType}`,
    `maskedValue: ${finding.maskedValue}`,
    `lineNumber: ${finding.lineNumber}`,
    `columnStart: ${finding.columnStart}`,
    `columnEnd: ${finding.columnEnd}`,
    `confidence: ${finding.confidence}`,
    `detectionLayer: ${finding.detectionLayer}`,
    `entropyScore: ${finding.entropyScore ?? 'n/a'}`,
    `candidates: ${candidates}`,
    `inlineContext: ${finding.context}`,
    '',
    'Surrounding context lines (±5):',
    contextBlock,
    '',
    'Return JSON with verdict, confidence (0-1), and a short reasoning string.',
  ].join('\n');
}
