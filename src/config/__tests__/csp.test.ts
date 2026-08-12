import { describe, it, expect } from 'vitest';
import { getCspHeaderString, parseCspHeader, validateCspHeader, CSP_HEADER_STRING } from '../csp';
import { EXPECTED_CSP_FIXTURE } from '../../test/fixtures/csp-fixture';

describe('WO-048: Content Security Policy Configuration & Validation Suite', () => {
  it('getCspHeaderString() matches the committed test fixture raw header', () => {
    expect(getCspHeaderString()).toBe(EXPECTED_CSP_FIXTURE.rawHeader);
    expect(CSP_HEADER_STRING).toBe(EXPECTED_CSP_FIXTURE.rawHeader);
  });

  it('contains all 10 required directives specified in WO-048 description & architecture', () => {
    const requiredKeys = [
      'default-src',
      'connect-src',
      'script-src',
      'style-src',
      'worker-src',
      'img-src',
      'object-src',
      'base-uri',
      'form-action',
      'frame-ancestors',
    ];

    const parsed = parseCspHeader(CSP_HEADER_STRING);
    expect(Object.keys(parsed)).toHaveLength(10);
    for (const key of requiredKeys) {
      expect(parsed).toHaveProperty(key);
    }
  });

  it('verifies exact values for critical security directives', () => {
    const parsed = parseCspHeader(CSP_HEADER_STRING);

    // default-src 'self'
    expect(parsed['default-src']).toEqual(["'self'"]);

    // connect-src 'self' https://model-cdn.example.com
    expect(parsed['connect-src']).toEqual(["'self'", 'https://model-cdn.example.com']);

    // script-src 'self'
    expect(parsed['script-src']).toEqual(["'self'"]);

    // style-src 'self' 'unsafe-inline'
    expect(parsed['style-src']).toEqual(["'self'", "'unsafe-inline'"]);

    // worker-src 'self' blob:
    expect(parsed['worker-src']).toEqual(["'self'", 'blob:']);

    // img-src 'self' data:
    expect(parsed['img-src']).toEqual(["'self'", 'data:']);

    // object-src 'none'
    expect(parsed['object-src']).toEqual(["'none'"]);

    // base-uri 'self'
    expect(parsed['base-uri']).toEqual(["'self'"]);

    // form-action 'none'
    expect(parsed['form-action']).toEqual(["'none'"]);

    // frame-ancestors 'none'
    expect(parsed['frame-ancestors']).toEqual(["'none'"]);
  });

  it('validateCspHeader() correctly passes a valid header and flags missing/mismatched directives', () => {
    const validResult = validateCspHeader(CSP_HEADER_STRING);
    expect(validResult.isValid).toBe(true);
    expect(validResult.missingDirectives).toHaveLength(0);
    expect(validResult.mismatchedValues).toHaveLength(0);

    // Incomplete CSP missing connect-src and object-src
    const incompleteCsp = "default-src 'self'; script-src 'self'; style-src 'self'";
    const incompleteResult = validateCspHeader(incompleteCsp);
    expect(incompleteResult.isValid).toBe(false);
    expect(incompleteResult.missingDirectives).toContain('connect-src');
    expect(incompleteResult.missingDirectives).toContain('object-src');

    // Mismatched CSP with unexpected origin in connect-src
    const mismatchedCsp = CSP_HEADER_STRING.replace(
      'https://model-cdn.example.com',
      'https://malicious-server.com'
    );
    const mismatchedResult = validateCspHeader(mismatchedCsp);
    expect(mismatchedResult.isValid).toBe(false);
    expect(mismatchedResult.mismatchedValues.length).toBeGreaterThan(0);
  });
});
