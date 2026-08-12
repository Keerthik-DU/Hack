import { describe, it, expect } from 'vitest';
import { containsDictionaryWords, extractCandidateTokens } from '../dictionary-filter';
import { DICTIONARY_TEST_FIXTURES } from './fixtures/dictionary-test-fixtures';

describe('WO-020: Dictionary-Word Filter for False Positive Reduction Suite', () => {
  describe('extractCandidateTokens() helper', () => {
    it('splits camelCase strings into individual lowercased word tokens', () => {
      const tokens = extractCandidateTokens('getAccessTokenFromStorage', 3);
      expect(tokens).toEqual(['get', 'access', 'token', 'from', 'storage']);
    });

    it('splits snake_case and kebab-case strings', () => {
      const tokens = extractCandidateTokens('user_session-token-identifier', 3);
      expect(tokens).toEqual(['user', 'session', 'token', 'identifier']);
    });

    it('filters out tokens shorter than minWordLength', () => {
      const tokens = extractCandidateTokens('is_it_a_valid_token', 3);
      expect(tokens).toEqual(['valid', 'token']);
    });
  });

  describe('containsDictionaryWords() pure function', () => {
    it('returns hasDictionaryWords = false for empty string and short strings (< 3 chars)', () => {
      const resEmpty = containsDictionaryWords('');
      expect(resEmpty.hasDictionaryWords).toBe(false);
      expect(resEmpty.wordCount).toBe(0);
      expect(resEmpty.matchedWords).toEqual([]);

      const resShort = containsDictionaryWords('ab');
      expect(resShort.hasDictionaryWords).toBe(false);
    });

    it('flags getAccessTokenFromStorage as containing 2 or more dictionary words (hasDictionaryWords = true)', () => {
      const res = containsDictionaryWords('getAccessTokenFromStorage');
      expect(res.hasDictionaryWords).toBe(true);
      expect(res.wordCount).toBeGreaterThanOrEqual(2);
      expect(res.matchedWords).toContain('access');
      expect(res.matchedWords).toContain('token');
    });

    it('does NOT flag random API key sk-proj-abc123XYZ789defGHI456 as containing >= 2 dictionary words', () => {
      const res = containsDictionaryWords('sk-proj-abc123XYZ789defGHI456');
      expect(res.hasDictionaryWords).toBe(false);
      expect(res.wordCount).toBeLessThan(2);
    });

    it('handles case insensitivity across uppercase, lowercase, and MixedCase inputs', () => {
      const resUpper = containsDictionaryWords('ACCESS_TOKEN_SECRET');
      expect(resUpper.hasDictionaryWords).toBe(true);

      const resLower = containsDictionaryWords('access_token_secret');
      expect(resLower.hasDictionaryWords).toBe(true);
    });

    it('does not count single or two-character noise words (e.g. a, is, to, in, on)', () => {
      const res = containsDictionaryWords('is_it_at_in_on_to_by');
      expect(res.hasDictionaryWords).toBe(false);
      expect(res.wordCount).toBe(0);
    });

    it('evaluates all 13 committed test fixtures in DICTIONARY_TEST_FIXTURES correctly', () => {
      for (const fixture of DICTIONARY_TEST_FIXTURES) {
        const res = containsDictionaryWords(fixture.input);
        expect(
          res.hasDictionaryWords,
          `Fixture '${fixture.id}' (${fixture.description}) expected hasDictionaryWords=${fixture.expectedHasWords}`
        ).toBe(fixture.expectedHasWords);

        if (fixture.expectedMinWordCount !== undefined) {
          expect(
            res.wordCount,
            `Fixture '${fixture.id}' expected wordCount >= ${fixture.expectedMinWordCount}`
          ).toBeGreaterThanOrEqual(fixture.expectedMinWordCount);
        }
      }
    });

    it('supports custom DictionaryFilterConfig for minWordCount, minWordLength, and customWordList', () => {
      const customConfig = {
        minWordCount: 1,
        minWordLength: 4,
        customWordList: ['custom', 'secret'],
      };

      const res1 = containsDictionaryWords('my_custom_value', customConfig);
      expect(res1.hasDictionaryWords).toBe(true);
      expect(res1.matchedWords).toEqual(['custom']);

      const res2 = containsDictionaryWords('my_random_value', customConfig);
      expect(res2.hasDictionaryWords).toBe(false);
    });

    it('passes UUIDs, SHA-256 hashes, and Base64 random keys without false positive filtering', () => {
      const uuidRes = containsDictionaryWords('f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
      expect(uuidRes.hasDictionaryWords).toBe(false);

      const shaRes = containsDictionaryWords(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
      expect(shaRes.hasDictionaryWords).toBe(false);

      const base64Res = containsDictionaryWords(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk'
      );
      expect(base64Res.hasDictionaryWords).toBe(false);
    });

    it('meets SLA performance: single string < 1ms, 500 strings < 200ms', () => {
      const sampleStrings = [
        'getAccessTokenFromStorage',
        'sk-proj-abc123XYZ789defGHI456',
        'user_session_token_identifier',
        '550e8400-e29b-41d4-a716-446655440000',
        'PasswordResetTokenGeneratorService',
      ];

      // 1. Single string execution time assertion
      const startSingle = performance.now();
      containsDictionaryWords('getAccessTokenFromStorage');
      const durationSingle = performance.now() - startSingle;
      expect(durationSingle).toBeLessThan(1.0); // < 1ms

      // 2. 500 strings execution time assertion
      const test500: string[] = [];
      for (let i = 0; i < 100; i++) {
        test500.push(...sampleStrings);
      }

      const startBatch = performance.now();
      for (const s of test500) {
        containsDictionaryWords(s);
      }
      const durationBatch = performance.now() - startBatch;

      console.log(
        `[WO-020 Perf Audit] Filtered 500 strings in ${durationBatch.toFixed(2)}ms (SLA target < 200ms)`
      );
      expect(durationBatch).toBeLessThan(200.0);
    });
  });
});
