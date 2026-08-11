import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatternRegistry } from '../regex/pattern-registry';
import testPatternsFixture from '@/test/fixtures/patterns/test-patterns.json';
import defaultPatternsJson from '@/patterns/v1/patterns.json';

describe('PatternRegistry Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization & Schema Validation', () => {
    it('throws a descriptive error when top-level pattern data is not an array', () => {
      expect(() => new PatternRegistry(null)).toThrow(
        'PatternRegistry initialization failed: Top-level pattern data must be a valid Array.'
      );
      expect(() => new PatternRegistry({ id: 'invalid-object' })).toThrow(
        'PatternRegistry initialization failed: Top-level pattern data must be a valid Array.'
      );
    });

    it('loads an empty array cleanly resulting in 0 compiled patterns', () => {
      const registry = new PatternRegistry([]);
      expect(registry.getPatternCount()).toBe(0);
      expect(registry.getPatterns()).toEqual([]);
    });

    it('skips schema-violating entries missing required fields and logs structured warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidSchemaData = [
        {
          // missing secretType
          id: 'bad-schema-1',
          regex: 'valid_regex',
          keywords: ['key'],
          category: 'generic',
        },
        {
          id: 'valid-schema-1',
          secretType: 'api_key',
          regex: 'valid_regex_pattern',
          keywords: ['key'],
          category: 'generic',
        },
      ];

      const registry = new PatternRegistry(invalidSchemaData);

      expect(registry.getPatternCount()).toBe(1);
      expect(registry.getPatterns()[0].id).toBe('valid-schema-1');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PatternRegistry Warning] Skipping invalid pattern definition'),
        expect.anything()
      );
    });
  });

  describe('Invalid Regex Handling & Duplicate Prevention', () => {
    it('skips invalid regex strings gracefully without failing the load process', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidRegexData = [
        {
          id: 'invalid-regex-pattern',
          secretType: 'generic_secret',
          regex: '[unclosed_bracket',
          keywords: ['test'],
          category: 'generic',
        },
        {
          id: 'valid-pattern',
          secretType: 'token',
          regex: 'valid_regex_string',
          keywords: ['token'],
          category: 'generic',
        },
      ];

      const registry = new PatternRegistry(invalidRegexData);

      expect(registry.getPatternCount()).toBe(1);
      expect(registry.getPatterns()[0].id).toBe('valid-pattern');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Skipping pattern 'invalid-regex-pattern' due to invalid RegExp compile error"
        )
      );
    });

    it('skips duplicate pattern IDs and logs warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const duplicateData = [
        {
          id: 'dup-id',
          secretType: 'api_key',
          regex: 'pattern_one',
          keywords: ['one'],
          category: 'generic',
        },
        {
          id: 'dup-id',
          secretType: 'api_key',
          regex: 'pattern_two',
          keywords: ['two'],
          category: 'generic',
        },
      ];

      const registry = new PatternRegistry(duplicateData);

      expect(registry.getPatternCount()).toBe(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping duplicate pattern ID 'dup-id'")
      );
    });
  });

  describe('Fixture & Production Patterns Tests', () => {
    it('correctly loads test-patterns.json fixture (5 valid, 2 invalid regex, 1 schema-violating -> 5 valid compiled)', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const registry = new PatternRegistry(testPatternsFixture);

      expect(registry.getPatternCount()).toBe(5);
      const compiled = registry.getPatterns();

      expect(compiled.map((p) => p.id)).toEqual([
        'valid-pattern-1',
        'valid-pattern-2',
        'valid-pattern-3',
        'valid-pattern-4',
        'valid-pattern-5',
      ]);

      expect(compiled[0].regex).toBeInstanceOf(RegExp);
    });

    it('system integration test: loads default production patterns.json and compiles 100% of patterns', () => {
      const registry = new PatternRegistry();

      expect(registry.getPatternCount()).toBe(defaultPatternsJson.length);
      expect(registry.getPatternCount()).toBe(50);

      const awsPatterns = registry.getPatternsByCategory('cloud-provider');
      expect(awsPatterns.length).toBeGreaterThan(0);
      expect(awsPatterns.some((p) => p.id === 'aws-access-key-id')).toBe(true);
    });
  });

  describe('Filtering & Keyword Pre-Filter Index', () => {
    it('filters patterns by category using getPatternsByCategory()', () => {
      const registry = new PatternRegistry(testPatternsFixture);

      const githubPatterns = registry.getPatternsByCategory('github');
      expect(githubPatterns).toHaveLength(1);
      expect(githubPatterns[0].id).toBe('valid-pattern-2');

      const nonExistent = registry.getPatternsByCategory('non-existent');
      expect(nonExistent).toEqual([]);
    });

    it('utilizes keyword pre-filter index to return relevant candidate patterns for line text', () => {
      const registry = new PatternRegistry(testPatternsFixture);

      const lineText = 'const token = "ghp_1234567890abcdef1234567890abcdef1234"; // github PAT';
      const candidatePatterns = registry.getPatternsForLine(lineText);

      expect(candidatePatterns.some((p) => p.id === 'valid-pattern-2')).toBe(true);
    });

    it('returns all patterns when line text has no keyword matches as fallback', () => {
      const registry = new PatternRegistry(testPatternsFixture);

      const lineText = 'no_matching_keywords_here_xyz_123';
      const candidates = registry.getPatternsForLine(lineText);

      expect(candidates).toHaveLength(5);
    });
  });
});
