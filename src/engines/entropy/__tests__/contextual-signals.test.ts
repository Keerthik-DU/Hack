import { describe, it, expect } from 'vitest';
import {
  analyzeContextualSignals,
  DEFAULT_SENSITIVE_KEYWORDS,
  StringContext,
} from '../contextual-signals';
import { CONTEXTUAL_TEST_FIXTURES } from './fixtures/contextual-test-fixtures';

describe('WO-021: Contextual Signal Analysis for Confidence Boosting Suite', () => {
  describe('analyzeContextualSignals() pure function', () => {
    it('returns hasSignal = false and confidenceAdjustment = neutral when context is undefined or empty', () => {
      const resUndefined = analyzeContextualSignals(undefined);
      expect(resUndefined.hasSignal).toBe(false);
      expect(resUndefined.confidenceAdjustment).toBe('neutral');
      expect(resUndefined.matchedKeywords).toEqual([]);

      const resEmpty = analyzeContextualSignals({});
      expect(resEmpty.hasSignal).toBe(false);
      expect(resEmpty.confidenceAdjustment).toBe('neutral');
      expect(resEmpty.matchedKeywords).toEqual([]);
    });

    it('detects each individual default sensitive keyword in variable names', () => {
      const keywords = [
        'password',
        'secret',
        'token',
        'key',
        'api_key',
        'credential',
        'auth',
        'private',
        'pwd',
        'pass',
        'access_key',
        'bearer',
        'jwt',
      ];

      for (const kw of keywords) {
        const ctx: StringContext = { variableName: `my_${kw}_value` };
        const res = analyzeContextualSignals(ctx);
        expect(res.hasSignal, `Failed to detect keyword '${kw}' in variableName`).toBe(true);
        expect(res.confidenceAdjustment).toBe('boost');
        expect(res.matchedKeywords.length).toBeGreaterThan(0);
      }
    });

    it('handles case variations: camelCase, snake_case, UPPER_CASE, PascalCase', () => {
      const cases = [
        { varName: 'apiKey', expectedKw: 'key' },
        { varName: 'database_password', expectedKw: 'password' },
        { varName: 'MY_API_KEY', expectedKw: 'key' },
        { varName: 'ClientSecretProvider', expectedKw: 'secret' },
        { varName: 'AuthTokenHeader', expectedKw: 'auth' },
      ];

      for (const c of cases) {
        const res = analyzeContextualSignals({ variableName: c.varName });
        expect(res.hasSignal, `Failed signal detection for case '${c.varName}'`).toBe(true);
        expect(res.confidenceAdjustment).toBe('boost');
      }
    });

    it('matches keywords as substrings within compound variable names', () => {
      const res1 = analyzeContextualSignals({ variableName: 'databasePasswordHash' });
      expect(res1.hasSignal).toBe(true);

      const res2 = analyzeContextualSignals({ variableName: 'x_custom_auth_header' });
      expect(res2.hasSignal).toBe(true);

      const res3 = analyzeContextualSignals({ variableName: 'userSessionToken' });
      expect(res3.hasSignal).toBe(true);
    });

    it('analyzes assignmentPattern and surroundingKeywords when variableName is absent', () => {
      const resAssign = analyzeContextualSignals({ assignmentPattern: 'const DB_SECRET = "xyz"' });
      expect(resAssign.hasSignal).toBe(true);
      expect(resAssign.confidenceAdjustment).toBe('boost');

      const resSurround = analyzeContextualSignals({
        surroundingKeywords: ['Authorization', 'Bearer'],
      });
      expect(resSurround.hasSignal).toBe(true);
      expect(resSurround.confidenceAdjustment).toBe('boost');
    });

    it('returns neutral adjustment for non-sensitive variable names (userDisplayName, itemIndex)', () => {
      const nonSensitiveVars = [
        'userDisplayName',
        'itemIndex',
        'totalCount',
        'headerTitle',
        'customerEmail',
      ];

      for (const v of nonSensitiveVars) {
        const res = analyzeContextualSignals({ variableName: v });
        expect(res.hasSignal, `Incorrect signal detected for non-sensitive variable '${v}'`).toBe(
          false
        );
        expect(res.confidenceAdjustment).toBe('neutral');
        expect(res.matchedKeywords).toEqual([]);
      }
    });

    it('evaluates all committed test fixtures in CONTEXTUAL_TEST_FIXTURES correctly', () => {
      for (const fixture of CONTEXTUAL_TEST_FIXTURES) {
        const res = analyzeContextualSignals(fixture.context);
        expect(
          res.hasSignal,
          `Fixture '${fixture.id}' (${fixture.description}) expected hasSignal=${fixture.expectedHasSignal}`
        ).toBe(fixture.expectedHasSignal);

        expect(
          res.confidenceAdjustment,
          `Fixture '${fixture.id}' expected confidenceAdjustment=${fixture.expectedAdjustment}`
        ).toBe(fixture.expectedAdjustment);
      }
    });

    it('supports custom keywords list overriding default sensitive keywords', () => {
      const customKw = ['token', 'session'];
      const res1 = analyzeContextualSignals({ variableName: 'user_session_id' }, customKw);
      expect(res1.hasSignal).toBe(true);

      const res2 = analyzeContextualSignals({ variableName: 'database_password' }, customKw);
      expect(res2.hasSignal).toBe(false); // 'password' not in custom list
    });

    it('exports DEFAULT_SENSITIVE_KEYWORDS typed constant array', () => {
      expect(DEFAULT_SENSITIVE_KEYWORDS.length).toBeGreaterThanOrEqual(10);
      expect(DEFAULT_SENSITIVE_KEYWORDS).toContain('password');
      expect(DEFAULT_SENSITIVE_KEYWORDS).toContain('secret');
      expect(DEFAULT_SENSITIVE_KEYWORDS).toContain('token');
      expect(DEFAULT_SENSITIVE_KEYWORDS).toContain('key');
    });
  });
});
