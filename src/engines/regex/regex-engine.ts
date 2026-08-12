import { IDetectionEngine } from '../types';
import { PatternRegistry } from './pattern-registry';
import { EngineInput, Finding, DetectionLayer } from '@/types';
import { prepareForRegex } from '@/orchestration/text-preprocessor';

/**
 * Generates redacted masked preview safe for display.
 * - Matches < 8 characters: replaced entirely with '***'.
 * - Matches >= 8 characters: first 4 characters + '***' + last 4 characters.
 */
export function generateMaskedPreview(match: string): string {
  if (!match || match.length < 8) {
    return '***';
  }
  const prefix = match.slice(0, 4);
  const suffix = match.slice(-4);
  return `${prefix}***${suffix}`;
}

/**
 * Layer 1 Detection Engine performing line-by-line regex pattern matching
 * using compiled patterns from PatternRegistry with keyword pre-filtering.
 */
export class RegexEngine implements IDetectionEngine {
  public readonly name = 'RegexEngine';
  public readonly layer: DetectionLayer = 1;
  private readonly registry: PatternRegistry;

  constructor(registry?: PatternRegistry) {
    this.registry = registry ?? new PatternRegistry();
  }

  /**
   * RegexEngine is deterministic and purely client-side; always available unconditionally.
   */
  public isAvailable(): boolean {
    return true;
  }

  /**
   * Analyzes engine input text line-by-line against keyword-filtered regex patterns.
   */
  public async analyze(input: EngineInput): Promise<Finding[]> {
    if (!input || !input.text || input.text.trim().length === 0) {
      return [];
    }

    if (input.signal?.aborted) {
      return [];
    }

    const lines = prepareForRegex(input.text);
    const findings: Finding[] = [];

    for (const line of lines) {
      if (input.signal?.aborted) {
        return findings;
      }

      const { lineText, lineNumber: zeroBasedLineNumber } = line;
      if (!lineText.trim()) {
        continue;
      }

      const oneBasedLineNumber = zeroBasedLineNumber + 1;
      const candidatePatterns = this.registry.getPatternsForLine(lineText);

      for (const pattern of candidatePatterns) {
        if (input.signal?.aborted) {
          return findings;
        }

        // Reset RegExp state before executing against line
        pattern.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.regex.exec(lineText)) !== null) {
          const matchedStr = match[0];
          if (!matchedStr) {
            break;
          }

          const columnStart = match.index;
          const columnEnd = columnStart + matchedStr.length;
          const maskedValue = generateMaskedPreview(matchedStr);

          findings.push({
            id: `finding-regex-${pattern.id}-${oneBasedLineNumber}-${columnStart}`,
            secretType: pattern.secretType,
            lineNumber: oneBasedLineNumber,
            columnStart,
            columnEnd,
            confidence: 'high',
            detectionLayer: 1,
            maskedValue,
            context: lineText,
          });

          // Prevent infinite loop for zero-width regex matches
          if (pattern.regex.lastIndex === match.index) {
            pattern.regex.lastIndex++;
          }
        }
      }
    }

    return findings;
  }
}
