/**
 * InputSanitizer pure function module (Security Zone 2 application boundary).
 * Neutralizes XSS attack vectors and performs idempotent HTML entity encoding
 * for untrusted user inputs.
 */

/**
 * Sanitizes unknown input data for safe rendering and internal processing.
 *
 * @param input - Untrusted input of unknown type.
 * @returns Sanitized, XSS-safe string. Returns empty string for non-string inputs.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  if (input.length === 0) {
    return '';
  }

  // Fast path for clean strings without HTML special characters
  if (!/[<>&"']/.test(input)) {
    return input;
  }

  // 1. Encode '&' ONLY if it is not already part of a valid HTML entity (idempotent protection)
  // Matches '&' not followed by entity pattern like &lt;, &gt;, &amp;, &quot;, &#x27;, &#39;, &#123;, &#x1F600;
  const entityPreservingAmpersandRegex = /&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g;
  let sanitized = input.replace(entityPreservingAmpersandRegex, '&amp;');

  // 2. Encode remaining 4 critical HTML characters: <, >, ", '
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}
