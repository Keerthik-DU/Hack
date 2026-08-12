import { Finding } from '@/types';

/**
 * Internal representation of an absolute character range within the original text,
 * paired with the secret type for placeholder generation.
 */
interface AbsoluteRange {
  start: number;
  end: number;
  secretType: string;
}

/**
 * Normalizes a secretType string into the placeholder suffix.
 *
 * Algorithm: `secretType.toUpperCase().replace(/\s+/g, '-')`
 *
 * @example
 * normalizeSecretType('aws_access_key')       // 'AWS_ACCESS_KEY'
 * normalizeSecretType('high entropy string')  // 'HIGH-ENTROPY-STRING'
 */
export function normalizeSecretType(secretType: string): string {
  return secretType.toUpperCase().replace(/\s+/g, '-');
}

/**
 * Builds an array mapping 1-indexed line numbers to their absolute character
 * offsets in the original text.  `lineStartOffsets[lineNumber - 1]` gives the
 * character position of the first character on that line.
 *
 * Handles `\n`, `\r\n`, and `\r` line endings correctly.
 */
function computeLineStartOffsets(text: string): number[] {
  const offsets: number[] = [0]; // line 1 always starts at offset 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\r') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        // Windows \r\n — next line starts two characters ahead
        offsets.push(i + 2);
        i++; // consume the \n
      } else {
        // Old Mac \r
        offsets.push(i + 1);
      }
    } else if (ch === '\n') {
      // Unix \n
      offsets.push(i + 1);
    }
  }

  return offsets;
}

/**
 * Merges ranges whose character spans overlap (start < other.end), leaving
 * adjacent ranges (start === other.end) as separate entries.
 *
 * When two ranges overlap, the resulting merged range uses the `secretType`
 * of the range that starts earliest (lowest `start`).
 *
 * Precondition: `ranges` may be in any order.
 * Postcondition: returned array is sorted descending by `start` for direct
 * use in the end-to-start replacement loop.
 */
function mergeOverlappingRanges(ranges: AbsoluteRange[]): AbsoluteRange[] {
  if (ranges.length === 0) return [];

  // Sort ascending by start (then by end for determinism on equal starts)
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: AbsoluteRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      // Overlapping: extend end if current reaches further; preserve first secretType
      if (current.end > last.end) {
        merged[merged.length - 1] = { ...last, end: current.end };
      }
      // else: current is fully contained within last — skip it
    } else {
      // Non-overlapping (or adjacent: start === last.end → separate placeholder)
      merged.push({ ...current });
    }
  }

  // Reverse to descending order for end-to-start replacement
  return merged.sort((a, b) => b.start - a.start);
}

/**
 * Replaces every detected secret finding in `originalText` with a typed
 * redaction placeholder of the form `[REDACTED-{NORMALIZED_TYPE}]`.
 *
 * Placeholder format:
 *   `[REDACTED-{secretType.toUpperCase().replace(/\s+/g, '-')}]`
 *
 * Algorithm:
 * 1. Convert each finding's (lineNumber, columnStart, columnEnd) to absolute
 *    character ranges using pre-computed per-line start offsets.
 * 2. Sort findings by characterRange.start descending.
 * 3. Merge overlapping ranges (adjacent ranges remain separate).
 * 4. Iterate from end to start, replacing each range with its placeholder.
 *    End-to-start processing ensures earlier absolute offsets stay valid
 *    despite the inserted placeholder strings having different lengths.
 *
 * Edge cases handled:
 * - Empty `findings` array → returns `originalText` unchanged.
 * - Findings whose `lineNumber` exceeds the line count → silently skipped.
 * - Findings where `columnStart >= columnEnd` → silently skipped.
 * - Overlapping findings → merged into one placeholder using the first type.
 * - Adjacent findings (end of one equals start of next) → two separate
 *   placeholders, not merged.
 * - Findings at offset 0 or at the very end of the text → handled correctly.
 *
 * @param originalText - The full original text to redact.
 * @param findings     - Detected secret findings (Finding[] from @/types).
 * @returns            The text with every finding replaced by its placeholder.
 */
export function redactText(originalText: string, findings: Finding[]): string {
  if (!originalText || findings.length === 0) return originalText;

  const lineStartOffsets = computeLineStartOffsets(originalText);

  // Convert findings to absolute ranges, skipping invalid ones
  const ranges: AbsoluteRange[] = [];

  for (const finding of findings) {
    const lineIndex = finding.lineNumber - 1; // convert 1-indexed to 0-indexed
    const lineOffset = lineStartOffsets[lineIndex];

    if (lineOffset === undefined) {
      // lineNumber exceeds actual line count — skip
      continue;
    }

    if (finding.columnStart >= finding.columnEnd) {
      // Zero-width or inverted range — skip
      continue;
    }

    ranges.push({
      start: lineOffset + finding.columnStart,
      end: lineOffset + finding.columnEnd,
      secretType: finding.secretType,
    });
  }

  if (ranges.length === 0) return originalText;

  // Merge overlapping ranges; result is sorted descending
  const mergedRanges = mergeOverlappingRanges(ranges);

  // Replace from end to start to preserve earlier offsets
  let result = originalText;
  for (const range of mergedRanges) {
    const safeStart = Math.max(0, range.start);
    const safeEnd = Math.min(result.length, range.end);
    const placeholder = `[REDACTED-${normalizeSecretType(range.secretType)}]`;
    result = result.slice(0, safeStart) + placeholder + result.slice(safeEnd);
  }

  return result;
}
