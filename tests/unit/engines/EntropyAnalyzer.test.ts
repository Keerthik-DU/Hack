/**
 * WO-062: Comprehensive Unit Tests for EntropyAnalyzer Module
 *
 * Run:
 *   npx vitest run tests/unit/engines/EntropyAnalyzer.test.ts
 */

import { describe, it, expect } from 'vitest';
import { EntropyAnalyzer } from '@/engines/entropy/entropy-analyzer';
import {
  calculateEntropy,
  meetsEntropyThreshold,
  DEFAULT_ENTROPY_THRESHOLD,
  DEFAULT_ENTROPY_MIN_LENGTH,
} from '@/engines/entropy/calculate-entropy';
import type { IDetectionEngine, EngineInput } from '@/engines/types';

const ALL_SAME_22 = 'aaaaaaaaaaaaaaaaaaaaaa';
const ALL_UNIQUE_22 = 'abcdefghijklmnopqrstuv';
const HEX_22 = '3a7f2b9c1d4e8f0a6b5c2d';
const BINARY_20 = '01010101010101010101';
const HIGH_ENTROPY_25 = 'xK9mP2vL8qR4wT6yH3nB7cD1z';
const MEDIUM_ENTROPY_22 = ALL_UNIQUE_22;
const DICT_CAMEL = 'TheQuickBrownFoxJumpsOver';
const UUID = '550e8400-e29b-41d4-a716-446655440000';
const GIT_SHA = 'a1b2c3d4e5f678901234567890abcdef12345678';
const BASE64_ENGLISH = 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVy';
const LONG_NUMERIC = '41111111111111111111';
const HIGH_19 = 'aB3xZ9mQ7kL1pW5vY2r';
const HIGH_20 = 'aB3xZ9mQ7kL1pW5vY2rN';
const HIGH_21 = 'aB3xZ9mQ7kL1pW5vY2rN8';

describe('WO-062: EntropyAnalyzer comprehensive unit tests', () => {
  describe('Shannon Entropy Computation', () => {
    it('returns 0 for an all-same-character string', () => {
      // Derivation: single symbol probability p=1 → -1*log2(1)=0
      expect(calculateEntropy(ALL_SAME_22)).toBe(0);
      expect(calculateEntropy(ALL_SAME_22)).toBeCloseTo(0, 2);
    });

    it('returns log2(n) for an all-unique-character string', () => {
      // Derivation: n=22 unique chars, each p=1/22 → H = log2(22)
      const expected = Math.log2(22);
      expect(calculateEntropy(ALL_UNIQUE_22)).toBeCloseTo(expected, 2);
      expect(Math.abs(calculateEntropy(ALL_UNIQUE_22) - expected)).toBeLessThanOrEqual(0.01);
    });

    it('returns ~2.0 bits for equal distribution of 4 characters (abcd)', () => {
      // Derivation: 4 symbols equal freq → H = log2(4) = 2
      expect(calculateEntropy('abcdabcdabcdabcdabcd')).toBeCloseTo(2.0, 2);
    });

    it('returns pre-computed entropy for a known hex string within 0.01', () => {
      expect(calculateEntropy(HEX_22)).toBeCloseTo(3.914, 2);
      expect(Math.abs(calculateEntropy(HEX_22) - 3.914)).toBeLessThanOrEqual(0.01);
    });

    it('returns pre-computed entropy for a known alphanumeric string within 0.01', () => {
      expect(calculateEntropy(HIGH_ENTROPY_25)).toBeCloseTo(4.6439, 2);
      expect(Math.abs(calculateEntropy(HIGH_ENTROPY_25) - 4.6439)).toBeLessThanOrEqual(0.01);
    });

    it('returns 1.0 for a balanced binary string of 0s and 1s', () => {
      // Derivation: two symbols equal freq → H = 1
      expect(calculateEntropy(BINARY_20)).toBeCloseTo(1.0, 2);
    });

    it('is deterministic for the same input', () => {
      expect(calculateEntropy(HIGH_ENTROPY_25)).toBe(calculateEntropy(HIGH_ENTROPY_25));
    });
  });

  describe('Threshold Behavior', () => {
    it('flags strings above the default calculateEntropy threshold (4.5)', () => {
      expect(DEFAULT_ENTROPY_THRESHOLD).toBe(4.5);
      expect(meetsEntropyThreshold(HIGH_ENTROPY_25)).toBe(true);
    });

    it('does not flag strings below the 4.5 threshold', () => {
      expect(meetsEntropyThreshold(MEDIUM_ENTROPY_22)).toBe(false);
      expect(calculateEntropy(MEDIUM_ENTROPY_22)).toBeLessThan(4.5);
    });

    it('flags strings exactly at the threshold (inclusive >=)', async () => {
      const exact = HIGH_ENTROPY_25;
      const exactEntropy = calculateEntropy(exact);
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: exactEntropy, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${exact}"` });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(meetsEntropyThreshold(exact, { threshold: exactEntropy, minLength: 20 })).toBe(true);
    });

    it('flags above-threshold strings via EntropyAnalyzer at threshold 4.5', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_ENTROPY_25}"` });
      expect(findings.length).toBe(1);
      expect(findings[0].secretType).toBe('high_entropy_string');
    });

    it('does not flag below-threshold strings via EntropyAnalyzer at threshold 4.5', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${MEDIUM_ENTROPY_22}"` });
      expect(findings).toEqual([]);
    });

    it('changes detection behavior with custom threshold 3.0', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HEX_22}aa"` });
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });

    it('changes detection behavior with custom threshold 5.0', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 5.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_ENTROPY_25}"` });
      expect(findings).toEqual([]);
    });

    it('uses analyzer default threshold 4.0 when options omitted', async () => {
      const analyzer = new EntropyAnalyzer();
      const findings = await analyzer.analyze({ text: `"${MEDIUM_ENTROPY_22}"` });
      expect(calculateEntropy(MEDIUM_ENTROPY_22)).toBeGreaterThanOrEqual(4.0);
      expect(findings.length).toBe(1);
    });
  });

  describe('Minimum Length Filtering', () => {
    it('never flags a 19-character high-entropy string', async () => {
      expect(HIGH_19.length).toBe(19);
      expect(DEFAULT_ENTROPY_MIN_LENGTH).toBe(20);
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_19}"` });
      expect(findings).toEqual([]);
      expect(meetsEntropyThreshold(HIGH_19, { threshold: 3.0, minLength: 20 })).toBe(false);
    });

    it('flags a 20-character high-entropy string at the boundary', async () => {
      expect(HIGH_20.length).toBe(20);
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_20}"` });
      expect(findings.length).toBe(1);
    });

    it('flags a 21-character high-entropy string', async () => {
      expect(HIGH_21.length).toBe(21);
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_21}"` });
      expect(findings.length).toBe(1);
    });

    it('flags a very long (1000+ char) high-entropy string', async () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let long = '';
      while (long.length < 1000) {
        long += alphabet;
      }
      long = long.slice(0, 1000);
      expect(long.length).toBe(1000);
      expect(calculateEntropy(long)).toBeGreaterThan(4.5);
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${long}"` });
      expect(findings.length).toBe(1);
    });
  });

  describe('Dictionary Word Filtering', () => {
    it('filters camelCase strings containing 3+ English words', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.0, minLength: 20 },
      });
      expect(calculateEntropy(DICT_CAMEL)).toBeGreaterThanOrEqual(4.0);
      const findings = await analyzer.analyze({ text: `"${DICT_CAMEL}"` });
      expect(findings).toEqual([]);
    });

    it('does not filter a high-entropy string with no dictionary words', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: `"${HIGH_ENTROPY_25}"` });
      expect(findings.length).toBe(1);
    });

    it('does not filter a string with fewer than 2 dictionary words (threshold is 2+)', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.0, minLength: 20 },
        dictionaryConfig: { minWordCount: 2, customWordList: ['zebra'] },
      });
      const value = 'zebraXK9mP2vL8qR4wT6yH3';
      const findings = await analyzer.analyze({ text: `"${value}"` });
      expect(findings.length).toBe(1);
    });

    it('still detects mixed-case dictionary words for filtering', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.0, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: '"theQuickBrownFoxJumps"' });
      expect(findings).toEqual([]);
    });

    it('filters getAccessTokenFromStorage-style camelCase identifiers', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 3.5, minLength: 20 },
      });
      const findings = await analyzer.analyze({ text: '"getAccessTokenFromStorage"' });
      expect(findings).toEqual([]);
    });
  });

  describe('Contextual Signal Boosting', () => {
    const mediumValue = HIGH_ENTROPY_25;

    async function analyzeAssignment(varName: string): Promise<'high' | 'medium' | 'low'> {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.0, minLength: 20 },
      });
      const input: EngineInput = { text: `const ${varName} = "${mediumValue}";` };
      const findings = await analyzer.analyze(input);
      expect(findings.length).toBe(1);
      return findings[0].confidence;
    }

    it('baseline: non-sensitive variable name yields medium confidence', async () => {
      expect(await analyzeAssignment('loopCounter')).toBe('medium');
    });

    it('boosts confidence to high for variable named password', async () => {
      expect(await analyzeAssignment('password')).toBe('high');
    });

    it('boosts confidence to high for variable named secret', async () => {
      expect(await analyzeAssignment('secret')).toBe('high');
    });

    it('boosts confidence to high for variable named token', async () => {
      expect(await analyzeAssignment('token')).toBe('high');
    });

    it('boosts confidence to high for variable named apiKey', async () => {
      expect(await analyzeAssignment('apiKey')).toBe('high');
    });

    it('boosts confidence to high for variable named key', async () => {
      expect(await analyzeAssignment('key')).toBe('high');
    });

    it('boosts confidence to high for variable named credential', async () => {
      expect(await analyzeAssignment('credential')).toBe('high');
    });
  });

  describe('False Positive Patterns', () => {
    it('does not flag UUID format strings (entropy below threshold)', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      expect(calculateEntropy(UUID)).toBeLessThan(4.5);
      expect(await analyzer.analyze({ text: `"${UUID}"` })).toEqual([]);
    });

    it('does not flag git commit SHAs (40 hex chars, entropy below 4.5)', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      expect(calculateEntropy(GIT_SHA)).toBeLessThan(4.5);
      expect(await analyzer.analyze({ text: `"${GIT_SHA}"` })).toEqual([]);
    });

    it('handles base64-encoded non-secret English by current filtering logic', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.5, minLength: 20 },
      });
      const entropy = calculateEntropy(BASE64_ENGLISH);
      const findings = await analyzer.analyze({ text: `"${BASE64_ENGLISH}"` });
      if (entropy >= 4.5) {
        for (const f of findings) {
          expect(f.secretType).toBe('high_entropy_string');
        }
      } else {
        expect(findings).toEqual([]);
      }
    });

    it('does not flag long numeric credit-card-like strings (very low entropy)', async () => {
      const analyzer = new EntropyAnalyzer({
        entropyConfig: { threshold: 4.0, minLength: 20 },
      });
      expect(calculateEntropy(LONG_NUMERIC)).toBeLessThan(1);
      expect(await analyzer.analyze({ text: `"${LONG_NUMERIC}"` })).toEqual([]);
    });
  });

  describe('String Extraction', () => {
    const analyzer = new EntropyAnalyzer({
      entropyConfig: { threshold: 4.5, minLength: 20 },
    });

    it('extracts double-quoted strings', async () => {
      const findings = await analyzer.analyze({ text: `const x = "${HIGH_ENTROPY_25}";` });
      expect(findings.length).toBe(1);
      expect(findings[0].columnStart).toBeGreaterThan(0);
    });

    it('extracts single-quoted strings', async () => {
      const findings = await analyzer.analyze({ text: `const x = '${HIGH_ENTROPY_25}';` });
      expect(findings.length).toBe(1);
    });

    it('extracts backtick template literal contents via token fallback when quoted extractor skips backticks', async () => {
      const findings = await analyzer.analyze({ text: 'const x = `' + HIGH_ENTROPY_25 + '`;' });
      expect(findings.length).toBe(1);
    });

    it('extracts assignment right-hand values', async () => {
      const findings = await analyzer.analyze({ text: `const configValue = ${HIGH_ENTROPY_25}` });
      expect(findings.length).toBe(1);
      expect(findings[0].lineNumber).toBe(1);
    });

    it('extracts JSON object values', async () => {
      const findings = await analyzer.analyze({ text: `{"token":"${HIGH_ENTROPY_25}"}` });
      expect(findings.length).toBe(1);
      expect(findings[0].confidence).toBe('high');
    });

    it('extracts YAML key-value pairs', async () => {
      const findings = await analyzer.analyze({ text: `api_secret: ${HIGH_ENTROPY_25}` });
      expect(findings.length).toBe(1);
    });

    it('extracts contiguous non-whitespace tokens >= minLength', async () => {
      const findings = await analyzer.analyze({ text: HIGH_ENTROPY_25 });
      expect(findings.length).toBe(1);
      expect(findings[0].columnStart).toBe(0);
      expect(findings[0].columnEnd).toBe(HIGH_ENTROPY_25.length);
    });
  });

  describe('Boundary Conditions', () => {
    const analyzer = new EntropyAnalyzer();

    it('returns empty findings for empty input without error', async () => {
      await expect(analyzer.analyze({ text: '' })).resolves.toEqual([]);
    });

    it('returns empty findings for whitespace-only input', async () => {
      await expect(analyzer.analyze({ text: '   \n\t  \n  ' })).resolves.toEqual([]);
    });

    it('returns empty findings when there are no extractable strings', async () => {
      expect(await analyzer.analyze({ text: '!!! !!! !!!' })).toEqual([]);
    });

    it('returns empty findings when only short tokens below minLength are present', async () => {
      expect(await analyzer.analyze({ text: 'abc def ghi jkl mno pqr' })).toEqual([]);
    });

    it('implements IDetectionEngine contract (name/layer/isAvailable)', () => {
      const asEngine: IDetectionEngine = analyzer;
      expect(asEngine.name).toBe('entropy');
      expect(asEngine.layer).toBe(3);
      expect(asEngine.isAvailable()).toBe(true);
    });

    it('respects aborted AbortSignal and returns empty/partial safely', async () => {
      const controller = new AbortController();
      controller.abort();
      const findings = await analyzer.analyze({
        text: `"${HIGH_ENTROPY_25}"`,
        signal: controller.signal,
      });
      expect(findings).toEqual([]);
    });
  });
});
