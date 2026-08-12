import { IDetectionEngine, EngineInput, Finding } from '../types';
import { calculateEntropy, meetsEntropyThreshold, EntropyConfig } from './calculate-entropy';
import { containsDictionaryWords, DictionaryFilterConfig } from './dictionary-filter';
import { analyzeContextualSignals, StringContext } from './contextual-signals';

export interface EntropyAnalyzerOptions {
  entropyConfig?: EntropyConfig;
  dictionaryConfig?: DictionaryFilterConfig;
  customSensitiveKeywords?: readonly string[];
}

/**
 * Layer 3 Entropy Analyzer implementing IDetectionEngine interface.
 * Calculates Shannon entropy of candidate strings, filters false positives using dictionary word matching,
 * and adjusts finding confidence based on contextual variable/assignment signals.
 */
export class EntropyAnalyzer implements IDetectionEngine {
  readonly name = 'entropy';
  readonly layer = 3 as const;

  private readonly entropyConfig: EntropyConfig;
  private readonly dictionaryConfig: DictionaryFilterConfig;
  private readonly customSensitiveKeywords?: readonly string[];

  constructor(options?: EntropyAnalyzerOptions) {
    this.entropyConfig = {
      threshold: options?.entropyConfig?.threshold ?? 4.0,
      minLength: options?.entropyConfig?.minLength ?? 20,
    };
    this.dictionaryConfig = {
      minWordLength: options?.dictionaryConfig?.minWordLength ?? 3,
      minWordCount: options?.dictionaryConfig?.minWordCount ?? 2,
      customWordList: options?.dictionaryConfig?.customWordList,
    };
    this.customSensitiveKeywords = options?.customSensitiveKeywords;
  }

  /**
   * Always returns true as entropy detection is pure computational JS with no hardware requirements.
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Scans EngineInput for high-entropy strings and returns findings.
   *
   * @param input EngineInput containing text, lines, and optional context metadata
   * @returns Promise resolving to an array of Finding objects
   */
  async analyze(input: EngineInput): Promise<Finding[]> {
    if (!input || !input.text || input.text.trim().length === 0) {
      return [];
    }

    if (input.signal?.aborted) {
      return [];
    }

    const findings: Finding[] = [];
    const lines = input.lines && input.lines.length > 0 ? input.lines : input.text.split('\n');

    lines.forEach((lineContent: string, lineIdx: number) => {
      if (input.signal?.aborted) {
        return;
      }

      const lineNumber = lineIdx + 1;
      // Extract quoted strings or unquoted tokens longer than minLength
      const candidates = this.extractCandidatesFromLine(lineContent);

      for (const candidate of candidates) {
        if (input.signal?.aborted) {
          return;
        }

        const { value, startIndex, endIndex } = candidate;

        // 1. Shannon entropy calculation & threshold check
        if (!meetsEntropyThreshold(value, this.entropyConfig)) {
          continue;
        }

        const entropyScore = calculateEntropy(value);

        // 2. Dictionary-word filter check for false positive reduction
        const dictResult = containsDictionaryWords(value, this.dictionaryConfig);
        if (dictResult.hasDictionaryWords) {
          // Candidate contains multiple common English words -> filter out
          continue;
        }

        // 3. Contextual signal analysis
        const lineContext: StringContext = {
          variableName: this.extractVariableName(lineContent, startIndex),
          assignmentPattern: lineContent,
          surroundingKeywords: [lineContent],
        };

        const signalResult = analyzeContextualSignals(lineContext, this.customSensitiveKeywords);

        // 4. Assign confidence
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (signalResult.hasSignal && signalResult.confidenceAdjustment === 'boost') {
          confidence = 'high';
        } else if (entropyScore > 5.2 && value.length >= 32) {
          confidence = 'high';
        }

        // 5. Generate Finding object conforming strictly to Finding interface
        const maskedValue = value.length > 8 ? `${value.slice(0, 4)}***${value.slice(-4)}` : '***';

        const finding: Finding = {
          id: `entropy-${lineNumber}-${startIndex}-${Date.now()}`,
          secretType: 'high_entropy_string',
          lineNumber,
          columnStart: startIndex,
          columnEnd: endIndex,
          confidence,
          detectionLayer: this.layer,
          maskedValue,
          context: lineContent,
        };

        findings.push(finding);
      }
    });

    return findings;
  }

  /**
   * Extracts candidate tokens (quoted strings or contiguous alphanumeric strings >= minLength) from a line.
   */
  private extractCandidatesFromLine(
    line: string
  ): Array<{ value: string; startIndex: number; endIndex: number }> {
    const candidates: Array<{ value: string; startIndex: number; endIndex: number }> = [];
    const minLength = this.entropyConfig.minLength ?? 20;

    // Match single or double quoted strings
    const quoteRegex = /(['"])(?:(?!\1)[^\\]|\\.)*\1/g;
    let match: RegExpExecArray | null;

    while ((match = quoteRegex.exec(line)) !== null) {
      const raw = match[0];
      const unquoted = raw.slice(1, -1);
      if (unquoted.length >= minLength) {
        candidates.push({
          value: unquoted,
          startIndex: match.index + 1,
          endIndex: match.index + raw.length - 1,
        });
      }
    }

    // Also match unquoted continuous non-whitespace candidate tokens >= minLength
    const tokenRegex = /[A-Za-z0-9+/=_-]{20,}/g;
    while ((match = tokenRegex.exec(line)) !== null) {
      const token = match[0];
      const matchIndex = match.index;
      // Avoid duplicate candidate if already covered by quote extraction
      const isAlreadyExtracted = candidates.some(
        (c) => c.startIndex <= matchIndex && c.endIndex >= matchIndex + token.length
      );
      if (!isAlreadyExtracted && token.length >= minLength) {
        candidates.push({
          value: token,
          startIndex: matchIndex,
          endIndex: matchIndex + token.length,
        });
      }
    }

    return candidates;
  }

  /**
   * Extracts variable name preceding an assignment on a line if present.
   */
  private extractVariableName(line: string, matchIdx: number): string | undefined {
    const prefix = line.slice(0, matchIdx);
    const assignMatch = /(?:const|let|var|export|set)?\s*([a-zA-Z0-9_$]+)\s*[:=]/i.exec(prefix);
    return assignMatch ? assignMatch[1] : undefined;
  }
}
