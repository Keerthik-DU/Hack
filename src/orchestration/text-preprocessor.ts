import { AmbiguousFinding } from '@/types';

export interface RegexInputLine {
  lineNumber: number;
  lineText: string;
  startOffset: number;
}

export interface EntropyCandidateMetadata {
  variableName?: string;
  hasKeywordProximity: boolean;
}

export interface EntropyCandidate {
  value: string;
  lineNumber: number;
  startOffset: number;
  metadata: EntropyCandidateMetadata;
}

export interface LLMPromptContext {
  finding: AmbiguousFinding;
  surroundingContext: string;
  contextStartLine: number;
  contextEndLine: number;
}

const SENSITIVE_KEYWORDS = ['password', 'secret', 'token', 'key', 'api_key', 'credential'];

/**
 * Splits input text into structured line objects with 0-based line numbers
 * and exact character start offsets relative to the original text.
 */
export function prepareForRegex(text: string): RegexInputLine[] {
  if (!text) {
    return [];
  }

  const lines: RegexInputLine[] = [];
  let currentOffset = 0;
  let currentLineIndex = 0;

  // Split by line breaks preserving delimiter lengths for offset tracking
  const lineRegex = /([^\r\n]*)(\r\n|\r|\n|$)/g;
  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(text)) !== null) {
    const lineText = match[1];
    const delimiter = match[2];

    // Avoid trailing empty match at EOF
    if (lineText.length === 0 && delimiter.length === 0 && currentOffset === text.length) {
      break;
    }

    lines.push({
      lineNumber: currentLineIndex,
      lineText,
      startOffset: currentOffset,
    });

    currentOffset += lineText.length + delimiter.length;
    currentLineIndex++;

    if (delimiter.length === 0) {
      break;
    }
  }

  return lines;
}

/**
 * Extracts LHS variable name from an assignment line (JS, Py, YAML, JSON, .env, HCL).
 */
function extractLHSVariableName(lineText: string): string | undefined {
  // 1. JS / Py / .env assignment: const KEY = ..., KEY = ...
  const stdAssignmentMatch = lineText.match(
    /(?:(?:const|let|var|export)\s+)?([A-Za-z0-9_$-]+)\s*(?:=|=>|:)/
  );
  if (stdAssignmentMatch && stdAssignmentMatch[1]) {
    return stdAssignmentMatch[1].trim();
  }

  // 2. JSON key: "apiKey": ...
  const jsonKeyMatch = lineText.match(/["']([A-Za-z0-9_$-]+)["']\s*:/);
  if (jsonKeyMatch && jsonKeyMatch[1]) {
    return jsonKeyMatch[1].trim();
  }

  return undefined;
}

/**
 * Checks whether line text or variable name contains any sensitive keywords.
 */
function checkKeywordProximity(lineText: string, variableName?: string): boolean {
  const lowerLine = lineText.toLowerCase();
  const lowerVar = variableName?.toLowerCase() ?? '';

  return SENSITIVE_KEYWORDS.some((kw) => lowerLine.includes(kw) || lowerVar.includes(kw));
}

/**
 * Extracts candidate strings (quoted strings, assignment RHS values, long non-whitespace tokens >= 20 chars)
 * paired with character offsets and contextual metadata for Shannon Entropy analysis.
 */
export function prepareForEntropy(text: string): EntropyCandidate[] {
  if (!text) {
    return [];
  }

  const lines = prepareForRegex(text);
  const candidates: EntropyCandidate[] = [];
  const seenOffsets = new Set<number>();

  for (const line of lines) {
    const { lineNumber, lineText, startOffset } = line;
    if (!lineText.trim()) {
      continue;
    }

    const variableName = extractLHSVariableName(lineText);
    const hasKeywordProximity = checkKeywordProximity(lineText, variableName);

    // Rule A: Quoted strings ('...', "...", `...`)
    const quoteRegex = /(["'`])((?:\\.|[^\\])*?)\1/g;
    let match: RegExpExecArray | null;

    while ((match = quoteRegex.exec(lineText)) !== null) {
      const val = match[2];
      if (val && val.length > 0) {
        const valueOffset = startOffset + match.index + match[1].length;
        if (!seenOffsets.has(valueOffset)) {
          seenOffsets.add(valueOffset);
          candidates.push({
            value: val,
            lineNumber,
            startOffset: valueOffset,
            metadata: {
              variableName,
              hasKeywordProximity,
            },
          });
        }
      }
    }

    // Rule B: Assignment RHS values (after =, :, =>)
    const rhsRegex = /(?:=|>|:)\s*([^\s"';,{}()]+)/g;
    while ((match = rhsRegex.exec(lineText)) !== null) {
      const val = match[1];
      if (val && val.length > 0) {
        const valIndexInLine = lineText.indexOf(val, match.index);
        const valueOffset = startOffset + (valIndexInLine !== -1 ? valIndexInLine : match.index);
        if (!seenOffsets.has(valueOffset)) {
          seenOffsets.add(valueOffset);
          candidates.push({
            value: val,
            lineNumber,
            startOffset: valueOffset,
            metadata: {
              variableName,
              hasKeywordProximity,
            },
          });
        }
      }
    }

    // Rule C: Contiguous non-whitespace tokens >= 20 characters
    const longTokenRegex = /\S{20,}/g;
    while ((match = longTokenRegex.exec(lineText)) !== null) {
      const val = match[0];
      const valueOffset = startOffset + match.index;
      if (!seenOffsets.has(valueOffset)) {
        seenOffsets.add(valueOffset);
        candidates.push({
          value: val,
          lineNumber,
          startOffset: valueOffset,
          metadata: {
            variableName,
            hasKeywordProximity,
          },
        });
      }
    }
  }

  return candidates;
}

/**
 * Packages ambiguous findings with plus/minus surrounding context lines (default 5)
 * into structured prompt contexts for LLM analysis.
 */
export function prepareForLLM(
  findings: AmbiguousFinding[],
  text: string,
  contextLines = 5
): LLMPromptContext[] {
  if (!findings || findings.length === 0 || !text) {
    return [];
  }

  const lines = prepareForRegex(text);
  if (lines.length === 0) {
    return [];
  }

  return findings.map((finding) => {
    // 0-based line index normalized from finding.lineNumber (1-based)
    const targetLineIndex = Math.max(0, Math.min(lines.length - 1, finding.lineNumber - 1));

    const startLineIndex = Math.max(0, targetLineIndex - contextLines);
    const endLineIndex = Math.min(lines.length - 1, targetLineIndex + contextLines);

    const surroundingContextLines = lines
      .slice(startLineIndex, endLineIndex + 1)
      .map((l) => l.lineText);

    const surroundingContext = surroundingContextLines.join('\n');

    return {
      finding,
      surroundingContext,
      contextStartLine: startLineIndex + 1, // 1-based line number for user UI display
      contextEndLine: endLineIndex + 1,
    };
  });
}
