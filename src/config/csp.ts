/**
 * Content Security Policy (CSP) Directives and Helper Utilities for AirGap Scanner.
 * Enforces Zone 1 (Network Perimeter) security guarantees at the browser level.
 */

export interface CspDirectives {
  readonly 'default-src': readonly string[];
  readonly 'connect-src': readonly string[];
  readonly 'script-src': readonly string[];
  readonly 'style-src': readonly string[];
  readonly 'worker-src': readonly string[];
  readonly 'img-src': readonly string[];
  readonly 'object-src': readonly string[];
  readonly 'base-uri': readonly string[];
  readonly 'form-action': readonly string[];
  readonly 'frame-ancestors': readonly string[];
}

export const REQUIRED_CSP_DIRECTIVES: CspDirectives = {
  'default-src': ["'self'"],
  'connect-src': ["'self'", 'https://model-cdn.example.com'],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'worker-src': ["'self'", 'blob:'],
  'img-src': ["'self'", 'data:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'none'"],
  'frame-ancestors': ["'none'"],
};

/**
 * Builds the exact required Content-Security-Policy header string.
 */
export function getCspHeaderString(): string {
  return Object.entries(REQUIRED_CSP_DIRECTIVES)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
}

export const CSP_HEADER_STRING = getCspHeaderString();

/**
 * Parses a Content-Security-Policy header string into a record of directives.
 */
export function parseCspHeader(headerString: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!headerString || typeof headerString !== 'string') {
    return result;
  }

  const parts = headerString
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    if (tokens.length > 0) {
      const directive = tokens[0].toLowerCase();
      const values = tokens.slice(1);
      result[directive] = values;
    }
  }

  return result;
}

export interface CspValidationResult {
  readonly isValid: boolean;
  readonly missingDirectives: string[];
  readonly mismatchedValues: string[];
}

/**
 * Validates a CSP header string against required directives.
 */
export function validateCspHeader(headerString: string): CspValidationResult {
  const parsed = parseCspHeader(headerString);
  const missingDirectives: string[] = [];
  const mismatchedValues: string[] = [];

  for (const [directive, expectedValues] of Object.entries(REQUIRED_CSP_DIRECTIVES)) {
    const actualValues = parsed[directive];
    if (!actualValues) {
      missingDirectives.push(directive);
      continue;
    }

    const expectedStr = expectedValues.join(' ');
    const actualStr = actualValues.join(' ');
    if (expectedStr !== actualStr) {
      mismatchedValues.push(`${directive}: expected [${expectedStr}] but got [${actualStr}]`);
    }
  }

  return {
    isValid: missingDirectives.length === 0 && mismatchedValues.length === 0,
    missingDirectives,
    mismatchedValues,
  };
}
