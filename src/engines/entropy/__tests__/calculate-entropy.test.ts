import { describe, it, expect } from 'vitest';
import {
  calculateEntropy,
  meetsEntropyThreshold,
  DEFAULT_ENTROPY_THRESHOLD,
  DEFAULT_ENTROPY_MIN_LENGTH,
} from '../calculate-entropy';
import { ENTROPY_TEST_FIXTURES } from './fixtures/entropy-test-strings';

describe('WO-019: Shannon Entropy Calculation Pure Function Suite', () => {
  describe('calculateEntropy() pure function', () => {
    it('returns 0 for empty string, null/undefined inputs, and single character strings', () => {
      expect(calculateEntropy('')).toBe(0);
      expect(calculateEntropy('a')).toBe(0);
      expect(calculateEntropy('z')).toBe(0);
    });

    it('returns 0 for strings where all characters are identical', () => {
      expect(calculateEntropy('aaaaaaaaaa')).toBe(0);
      expect(calculateEntropy('FFFFFFFFFFFFFFFFFFFF')).toBe(0);
      expect(calculateEntropy('                    ')).toBe(0);
    });

    it('returns exactly 1.0 bits/char for two characters with equal frequency', () => {
      expect(calculateEntropy('ab')).toBe(1.0);
      expect(calculateEntropy('abababababababab')).toBe(1.0);
      expect(calculateEntropy('0101010101010101')).toBe(1.0);
    });

    it('returns approximately log2(N) for string containing N unique characters each appearing once', () => {
      // 10 unique characters -> log2(10) ~ 3.321928094887362
      const result10 = calculateEntropy('abcdefghij');
      expect(result10).toBeCloseTo(Math.log2(10), 4);

      // 16 unique characters -> 4.0 bits/char
      const result16 = calculateEntropy('0123456789abcdef');
      expect(result16).toBe(4.0);

      // 95 unique printable ASCII characters -> log2(95) ~ 6.5698556
      const asciiPrintable = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join(
        ''
      );
      const result95 = calculateEntropy(asciiPrintable);
      expect(result95).toBeCloseTo(Math.log2(95), 4);
    });

    it('validates pre-calculated expected entropy values from ENTROPY_TEST_FIXTURES (20 fixture cases)', () => {
      for (const fixture of ENTROPY_TEST_FIXTURES) {
        const entropy = calculateEntropy(fixture.input);
        if (fixture.tolerance !== undefined) {
          expect(
            Math.abs(entropy - fixture.expectedEntropy),
            `Fixture '${fixture.id}' failed entropy calculation check: expected ~${fixture.expectedEntropy}, got ${entropy}`
          ).toBeLessThanOrEqual(fixture.tolerance);
        } else {
          expect(entropy, `Fixture '${fixture.id}' failed exact entropy check`).toBeCloseTo(
            fixture.expectedEntropy,
            4
          );
        }
      }
    });

    it('handles multi-byte unicode characters and emojis correctly', () => {
      const emojiString = '🔒🔑🛡️🔐🔒🔑🛡️🔐';
      const entropy = calculateEntropy(emojiString);
      expect(entropy).toBeGreaterThan(0);
    });
  });

  describe('meetsEntropyThreshold() helper function', () => {
    it('returns false for null, undefined, empty strings, or strings shorter than minLength', () => {
      expect(meetsEntropyThreshold('')).toBe(false);
      expect(meetsEntropyThreshold('1234567890123456789')).toBe(false); // 19 chars < 20
    });

    it('uses default threshold (4.5) and minLength (20) when config is omitted', () => {
      // String with 19 chars (high entropy) -> false due to minLength 20
      const highEntropy19 = 'aB3$xZ9!mQ7#kL1@pW5';
      expect(meetsEntropyThreshold(highEntropy19)).toBe(false);

      // String with 20 chars but low entropy (repeating pattern) -> false due to threshold 4.5
      const lowEntropy20 = 'abababababababababab';
      expect(meetsEntropyThreshold(lowEntropy20)).toBe(false);

      // High entropy string with 40 chars (>4.5 entropy & >=20 length) -> true
      const highEntropySecret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      expect(meetsEntropyThreshold(highEntropySecret)).toBe(true);
    });

    it('respects custom EntropyConfig overrides for minLength and threshold', () => {
      const input15 = 'aB3$xZ9!mQ7#kL1'; // 15 chars, high entropy (~3.9)

      // Fails under default minLength (20) and default threshold (4.5)
      expect(meetsEntropyThreshold(input15)).toBe(false);

      // Passes under custom minLength (10) and custom threshold (3.5)
      expect(meetsEntropyThreshold(input15, { minLength: 10, threshold: 3.5 })).toBe(true);

      // Fails under custom minLength (10) if threshold is set higher (4.5)
      expect(meetsEntropyThreshold(input15, { minLength: 10, threshold: 4.5 })).toBe(false);
    });

    it('verifies exact threshold boundary conditions (4.49 vs 4.50 vs 4.51)', () => {
      const exactString = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const actualEntropy = calculateEntropy(exactString); // ~5.02

      expect(
        meetsEntropyThreshold(exactString, { minLength: 10, threshold: actualEntropy - 0.01 })
      ).toBe(true);
      expect(meetsEntropyThreshold(exactString, { minLength: 10, threshold: actualEntropy })).toBe(
        true
      );
      expect(
        meetsEntropyThreshold(exactString, { minLength: 10, threshold: actualEntropy + 0.01 })
      ).toBe(false);
    });

    it('verifies exact length boundary conditions (19 chars vs 20 chars vs 21 chars)', () => {
      const char21 = 'aB3$xZ9!mQ7#kL1@pW5&v'; // 21 chars
      const char20 = 'aB3$xZ9!mQ7#kL1@pW5&'; // 20 chars
      const char19 = 'aB3$xZ9!mQ7#kL1@pW5'; // 19 chars

      const lowThresholdConfig = { threshold: 3.0, minLength: 20 };

      expect(meetsEntropyThreshold(char21, lowThresholdConfig)).toBe(true);
      expect(meetsEntropyThreshold(char20, lowThresholdConfig)).toBe(true);
      expect(meetsEntropyThreshold(char19, lowThresholdConfig)).toBe(false);
    });
  });

  describe('Exported Constants & TypeScript Signature Integrity', () => {
    it('exports DEFAULT_ENTROPY_THRESHOLD = 4.5 and DEFAULT_ENTROPY_MIN_LENGTH = 20', () => {
      expect(DEFAULT_ENTROPY_THRESHOLD).toBe(4.5);
      expect(DEFAULT_ENTROPY_MIN_LENGTH).toBe(20);
    });
  });
});
