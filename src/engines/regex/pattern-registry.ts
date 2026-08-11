import { PatternDefinition, CompiledPattern } from '../types';
import defaultPatternsData from '@/patterns/v1/patterns.json';

/**
 * Infrastructure registry loading pattern definitions, compiling regexes into native RegExp objects,
 * validating schema rules, and providing fast keyword-indexed access.
 */
export class PatternRegistry {
  private readonly compiledPatterns: CompiledPattern[] = [];
  private readonly patternsById = new Map<string, CompiledPattern>();
  private readonly keywordIndex = new Map<string, Set<CompiledPattern>>();

  constructor(patternData: unknown = defaultPatternsData) {
    this.loadAndCompilePatterns(patternData);
  }

  /**
   * Validates top-level schema and compiles pattern definitions.
   */
  private loadAndCompilePatterns(patternData: unknown): void {
    if (!Array.isArray(patternData)) {
      throw new Error(
        'PatternRegistry initialization failed: Top-level pattern data must be a valid Array.'
      );
    }

    for (const rawItem of patternData) {
      if (!this.isValidPatternDefinition(rawItem)) {
        console.warn(
          '[PatternRegistry Warning] Skipping invalid pattern definition (missing required fields or invalid schema):',
          rawItem
        );
        continue;
      }

      const item = rawItem as PatternDefinition;

      if (this.patternsById.has(item.id)) {
        console.warn(`[PatternRegistry Warning] Skipping duplicate pattern ID '${item.id}'.`);
        continue;
      }

      try {
        // Compile regex into native RegExp object with global flag
        const compiledRegex = new RegExp(item.regex, 'g');

        const compiled: CompiledPattern = {
          id: item.id,
          secretType: item.secretType,
          regex: compiledRegex,
          keywords: Array.isArray(item.keywords) ? item.keywords : [],
          category: item.category,
          severity: item.severity,
          secretGroup: item.secretGroup,
          allowlist: item.allowlist,
        };

        this.compiledPatterns.push(compiled);
        this.patternsById.set(item.id, compiled);
        this.indexKeywords(compiled);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(
          `[PatternRegistry Warning] Skipping pattern '${item.id}' due to invalid RegExp compile error: ${errorMessage}`
        );
      }
    }
  }

  /**
   * Validates whether raw item conforms to the PatternDefinition schema.
   */
  private isValidPatternDefinition(item: unknown): boolean {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const obj = item as Record<string, unknown>;

    return (
      typeof obj.id === 'string' &&
      obj.id.trim().length > 0 &&
      typeof obj.secretType === 'string' &&
      typeof obj.regex === 'string' &&
      obj.regex.length > 0 &&
      Array.isArray(obj.keywords) &&
      typeof obj.category === 'string'
    );
  }

  /**
   * Builds O(1) keyword pre-filter index mapping lowercase keywords to CompiledPattern sets.
   */
  private indexKeywords(pattern: CompiledPattern): void {
    for (const kw of pattern.keywords) {
      if (typeof kw === 'string' && kw.length > 0) {
        const lowerKw = kw.toLowerCase();
        let patternSet = this.keywordIndex.get(lowerKw);
        if (!patternSet) {
          patternSet = new Set<CompiledPattern>();
          this.keywordIndex.set(lowerKw, patternSet);
        }
        patternSet.add(pattern);
      }
    }
  }

  /**
   * Returns all successfully compiled patterns.
   */
  public getPatterns(): CompiledPattern[] {
    return [...this.compiledPatterns];
  }

  /**
   * Returns total count of compiled patterns.
   */
  public getPatternCount(): number {
    return this.compiledPatterns.length;
  }

  /**
   * Returns compiled patterns filtered by category name.
   */
  public getPatternsByCategory(category: string): CompiledPattern[] {
    if (!category) {
      return [];
    }
    const lowerCategory = category.toLowerCase();
    return this.compiledPatterns.filter((p) => p.category.toLowerCase() === lowerCategory);
  }

  /**
   * Returns compiled patterns whose keywords match any substring in lineText.
   * If lineText contains no matched keywords, returns all patterns as fallback.
   */
  public getPatternsForLine(lineText: string): CompiledPattern[] {
    if (!lineText || this.keywordIndex.size === 0) {
      return this.getPatterns();
    }

    const lowerLine = lineText.toLowerCase();
    const matchedPatterns = new Set<CompiledPattern>();

    for (const [kw, patternSet] of this.keywordIndex.entries()) {
      if (lowerLine.includes(kw)) {
        for (const pattern of patternSet) {
          matchedPatterns.add(pattern);
        }
      }
    }

    return matchedPatterns.size > 0 ? Array.from(matchedPatterns) : this.getPatterns();
  }
}
