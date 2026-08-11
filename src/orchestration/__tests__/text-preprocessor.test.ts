import { describe, it, expect } from 'vitest';
import { prepareForRegex, prepareForEntropy, prepareForLLM } from '../text-preprocessor';
import {
  jsCodeSample,
  pythonCodeSample,
  yamlCodeSample,
  jsonCodeSample,
  envCodeSample,
  terraformHclCodeSample,
} from '../__fixtures__/code-samples';
import { AmbiguousFinding } from '@/types';

describe('TextPreprocessor Module (Stage 2 Data Pipeline)', () => {
  describe('prepareForRegex Function', () => {
    it('returns empty array for empty or null string input', () => {
      expect(prepareForRegex('')).toEqual([]);
    });

    it('splits text into lines with 0-based lineNumber and exact startOffset tracking (\n)', () => {
      const text = 'line 0\nline 1\nline 2';
      const lines = prepareForRegex(text);

      expect(lines).toHaveLength(3);
      expect(lines[0]).toEqual({ lineNumber: 0, lineText: 'line 0', startOffset: 0 });
      expect(lines[1]).toEqual({ lineNumber: 1, lineText: 'line 1', startOffset: 7 });
      expect(lines[2]).toEqual({ lineNumber: 2, lineText: 'line 2', startOffset: 14 });
    });

    it('handles Windows CRLF (\\r\\n) line breaks with accurate offsets', () => {
      const text = 'first\r\nsecond\r\nthird';
      const lines = prepareForRegex(text);

      expect(lines).toHaveLength(3);
      expect(lines[0]).toEqual({ lineNumber: 0, lineText: 'first', startOffset: 0 });
      expect(lines[1]).toEqual({ lineNumber: 1, lineText: 'second', startOffset: 7 });
      expect(lines[2]).toEqual({ lineNumber: 2, lineText: 'third', startOffset: 15 });
    });
  });

  describe('prepareForEntropy Function', () => {
    it('returns empty array for empty string input', () => {
      expect(prepareForEntropy('')).toEqual([]);
    });

    it('returns empty array when text contains no extractable candidate strings', () => {
      expect(prepareForEntropy('   \n  \n  ')).toEqual([]);
    });

    it('extracts quoted strings, RHS values, and long tokens from JS code sample', () => {
      const candidates = prepareForEntropy(jsCodeSample);
      expect(candidates.length).toBeGreaterThan(0);

      const apiKeyCandidate = candidates.find(
        (c) => c.value === 'mock_api_key_sample_value_1234567890'
      );
      expect(apiKeyCandidate).toBeDefined();
      expect(apiKeyCandidate?.metadata.variableName).toBe('API_KEY');
      expect(apiKeyCandidate?.metadata.hasKeywordProximity).toBe(true);

      const secretTokenCandidate = candidates.find(
        (c) => c.value === 'mock_secret_token_sample_value_987654'
      );
      expect(secretTokenCandidate).toBeDefined();
      expect(secretTokenCandidate?.metadata.variableName).toBe('secret_token');
      expect(secretTokenCandidate?.metadata.hasKeywordProximity).toBe(true);
    });

    it('extracts candidates from multi-format code samples (Python, YAML, JSON, .env, HCL)', () => {
      // Python
      const pyCandidates = prepareForEntropy(pythonCodeSample);
      expect(pyCandidates.some((c) => c.metadata.variableName === 'AWS_SECRET_ACCESS_KEY')).toBe(
        true
      );

      // YAML
      const yamlCandidates = prepareForEntropy(yamlCodeSample);
      expect(
        yamlCandidates.some(
          (c) => c.value === 'mock_long_token_string_exceeding_twenty_chars_easily'
        )
      ).toBe(true);

      // JSON
      const jsonCandidates = prepareForEntropy(jsonCodeSample);
      expect(jsonCandidates.some((c) => c.metadata.variableName === 'apiKey')).toBe(true);

      // .env
      const envCandidates = prepareForEntropy(envCodeSample);
      expect(envCandidates.some((c) => c.metadata.variableName === 'AWS_SECRET_ACCESS_KEY')).toBe(
        true
      );

      // Terraform HCL
      const hclCandidates = prepareForEntropy(terraformHclCodeSample);
      expect(hclCandidates.some((c) => c.metadata.variableName === 'password')).toBe(true);
    });

    it('correctly sets hasKeywordProximity flag when sensitive keywords are present', () => {
      const candidates = prepareForEntropy('const user_password = "my_sample_password_val";');
      const cand = candidates.find((c) => c.value === 'my_sample_password_val');

      expect(cand).toBeDefined();
      expect(cand?.metadata.hasKeywordProximity).toBe(true);
    });
  });

  describe('prepareForLLM Function', () => {
    it('returns empty array when findings array or text is empty', () => {
      expect(prepareForLLM([], 'some text')).toEqual([]);
      expect(prepareForLLM([], '')).toEqual([]);
    });

    it('packages ambiguous findings with plus/minus 5 lines of surrounding context', () => {
      const multiLineText = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
      const mockFinding: AmbiguousFinding = {
        id: 'finding-001',
        secretType: 'generic_secret',
        lineNumber: 10, // Line 10
        columnStart: 5,
        columnEnd: 25,
        confidence: 'medium',
        detectionLayer: 2,
        maskedValue: 'Line 10...',
        context: 'Line 10',
        entropyScore: 4.8,
        candidates: ['generic_secret'],
      };

      const contexts = prepareForLLM([mockFinding], multiLineText, 5);

      expect(contexts).toHaveLength(1);
      expect(contexts[0].contextStartLine).toBe(5); // Line 10 - 5 = Line 5
      expect(contexts[0].contextEndLine).toBe(15); // Line 10 + 5 = Line 15
      expect(contexts[0].surroundingContext).toContain('Line 5');
      expect(contexts[0].surroundingContext).toContain('Line 10');
      expect(contexts[0].surroundingContext).toContain('Line 15');
      expect(contexts[0].surroundingContext).not.toContain('Line 4');
      expect(contexts[0].surroundingContext).not.toContain('Line 16');
    });

    it('handles context windowing near top and bottom boundaries of text safely', () => {
      const shortText = 'Line 1\nLine 2\nLine 3';
      const mockFinding: AmbiguousFinding = {
        id: 'finding-002',
        secretType: 'token',
        lineNumber: 1,
        columnStart: 1,
        columnEnd: 5,
        confidence: 'low',
        detectionLayer: 2,
        maskedValue: 'Line 1...',
        context: 'Line 1',
        entropyScore: 4.2,
      };

      const contexts = prepareForLLM([mockFinding], shortText, 5);

      expect(contexts).toHaveLength(1);
      expect(contexts[0].contextStartLine).toBe(1);
      expect(contexts[0].contextEndLine).toBe(3);
      expect(contexts[0].surroundingContext).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Performance Benchmark', () => {
    it('completes prepareForRegex and prepareForEntropy on 100,000-character input in under 50ms', () => {
      const lineSample =
        'const MOCK_KEY = "mock_secret_value_sample_token_1234567890"; // comment key\n';
      const largeText = lineSample.repeat(1300); // ~101,000 characters
      expect(largeText.length).toBeGreaterThan(100000);

      const startTime = performance.now();

      const regexLines = prepareForRegex(largeText);
      const entropyCandidates = prepareForEntropy(largeText);

      const durationMs = performance.now() - startTime;

      expect(regexLines.length).toBeGreaterThan(1000);
      expect(entropyCandidates.length).toBeGreaterThan(1000);
      expect(durationMs).toBeLessThan(50); // Must complete in < 50ms
    });
  });
});
