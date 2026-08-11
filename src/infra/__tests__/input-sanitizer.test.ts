import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../input-sanitizer';
import { xssVectorFixtures } from '../__fixtures__/xss-vectors';

describe('InputSanitizer Module (Security Zone 2)', () => {
  describe('Non-string Input Safety', () => {
    it('returns empty string for non-string inputs without throwing', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(12345)).toBe('');
      expect(sanitizeInput(true)).toBe('');
      expect(sanitizeInput(false)).toBe('');
      expect(sanitizeInput({})).toBe('');
      expect(sanitizeInput([1, 2, 3])).toBe('');
      expect(sanitizeInput(() => {})).toBe('');
    });
  });

  describe('Critical HTML Entity Encoding', () => {
    it('encodes the 5 critical HTML entity characters correctly', () => {
      expect(sanitizeInput('<')).toBe('&lt;');
      expect(sanitizeInput('>')).toBe('&gt;');
      expect(sanitizeInput('&')).toBe('&amp;');
      expect(sanitizeInput('"')).toBe('&quot;');
      expect(sanitizeInput("'")).toBe('&#x27;');
      expect(sanitizeInput('<script>alert("XSS & \'more\'")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; &#x27;more&#x27;&quot;)&lt;/script&gt;'
      );
    });
  });

  describe('OWASP XSS Attack Vectors Evasion Tests', () => {
    it('neutralizes all 27 OWASP XSS attack vectors safely', () => {
      expect(xssVectorFixtures.length).toBeGreaterThanOrEqual(25);

      xssVectorFixtures.forEach(({ id, name, vector }) => {
        const sanitized = sanitizeInput(vector);

        // Invariant 1: Must not contain raw '<' or '>'
        expect(sanitized, `Vector ${id} (${name}) failed raw angle bracket check`).not.toMatch(
          /[<>]/
        );

        // Invariant 2: Must be non-empty
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Idempotency & Double-Encoding Prevention', () => {
    it('is idempotent: sanitizing an already-sanitized string produces identical output', () => {
      const testInputs = [
        '<script>alert(1)</script>',
        'Hello & World',
        '"Double" and \'Single\' Quotes',
        ...xssVectorFixtures.map((v) => v.vector),
      ];

      testInputs.forEach((input) => {
        const firstPass = sanitizeInput(input);
        const secondPass = sanitizeInput(firstPass);
        expect(secondPass, `Failed idempotency for input: ${input}`).toBe(firstPass);
      });
    });
  });

  describe('Boundary Conditions & Preserved Formatting', () => {
    it('preserves empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('preserves whitespace-only input without trimming', () => {
      const whitespace = '   \n\t  \r  ';
      expect(sanitizeInput(whitespace)).toBe(whitespace);
    });

    it('preserves Unicode and Emoji characters unmodified', () => {
      const unicodeString = '🎉 Security Scanner 🚀 🔐 こんにちは world';
      expect(sanitizeInput(unicodeString)).toBe(unicodeString);
    });

    it('executes sanitization on a 100,000-character input in under 10ms', () => {
      const baseChunk = 'const key = "<AWS_KEY_SAMPLE>"; // & test "quote" \'single\'\n';
      const largeInput = baseChunk.repeat(2000); // ~114,000 chars
      expect(largeInput.length).toBeGreaterThan(100000);

      const startTime = performance.now();
      const sanitized = sanitizeInput(largeInput);
      const durationMs = performance.now() - startTime;

      expect(sanitized).toBeDefined();
      expect(sanitized.length).toBeGreaterThan(largeInput.length); // Expanded due to entity encoding
      expect(durationMs).toBeLessThan(10); // Must complete under 10ms
    });
  });
});
