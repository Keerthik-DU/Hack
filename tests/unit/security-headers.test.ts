/**
 * WO-049: Unit tests for the SECURITY_HEADERS configuration constant.
 *
 * These tests validate that all five required HTTP security response headers
 * are defined with their exact required values, satisfying acceptance criteria
 * 1–5 and 8 (configuration test).
 */
import { describe, it, expect } from 'vitest';
import { SECURITY_HEADERS } from '../../src/config/security-headers';
import expectedHeaders from '../fixtures/expected-security-headers.json';

describe('WO-049: Security Headers Configuration', () => {
  it('exports exactly five security headers', () => {
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(5);
  });

  it('defines Strict-Transport-Security with max-age=31536000, includeSubDomains, preload', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('defines X-Content-Type-Options with value nosniff', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('defines X-Frame-Options with value DENY', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('defines Referrer-Policy with value no-referrer', () => {
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
  });

  it('defines Permissions-Policy disabling camera, microphone, geolocation, and payment', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
  });

  it('SECURITY_HEADERS contains all five required header names', () => {
    const requiredHeaders = [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ];
    for (const name of requiredHeaders) {
      expect(SECURITY_HEADERS).toHaveProperty(name);
    }
  });

  it('snapshot comparison: matches the expected-security-headers.json fixture', () => {
    expect(SECURITY_HEADERS).toEqual(expectedHeaders);
  });

  it('HSTS preload directive is present (preload submission is deferred — see SECURITY.md)', () => {
    const hsts = SECURITY_HEADERS['Strict-Transport-Security'];
    expect(hsts).toContain('preload');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('max-age=31536000');
  });

  it('Permissions-Policy uses standardized empty-list syntax, not the deprecated none syntax', () => {
    const policy = SECURITY_HEADERS['Permissions-Policy'];
    // Standardized syntax: camera=()  NOT  camera 'none'
    expect(policy).toMatch(/camera=\(\)/);
    expect(policy).toMatch(/microphone=\(\)/);
    expect(policy).toMatch(/geolocation=\(\)/);
    expect(policy).toMatch(/payment=\(\)/);
    expect(policy).not.toContain("'none'");
  });
});
