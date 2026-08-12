/**
 * InputSanitizer Unit Tests
 *
 * Template for unit test files in AirGap Scanner.
 *
 * TESTING PATTERNS (follow these for all new test files):
 * - Use Vitest's describe/it/expect API
 * - Group related cases in nested describe blocks by behavior category
 * - Name each it() block with a plain-English statement of what is asserted
 * - Define XSS payload fixtures as inline constants for transparency/auditability
 * - Use performance.now() for timing assertions — no external benchmark libraries
 * - Tests must NOT depend on DOM APIs; InputSanitizer is a pure Node.js function
 * - No external XSS testing libraries — all vectors defined inline for auditability
 *
 * COVERAGE GOALS:
 * - Every HTML-significant character escaped individually
 * - Every major XSS injection category neutralized
 * - All boundary / edge-case inputs handled without throwing
 * - Unicode strings pass through unmodified unless they contain HTML-significant chars
 * - Idempotency: a second sanitize pass must not change already-sanitized output
 * - Performance: 100 000-character input processed in < 50 ms
 *
 * Run this file directly:
 *   npx vitest run tests/unit/infra/
 */

import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '@/infra/input-sanitizer';

// ---------------------------------------------------------------------------
// Inline XSS payload fixtures (OWASP XSS Filter Evasion Cheat Sheet patterns)
// Defined here (not imported) so the test file is self-contained and auditable.
// ---------------------------------------------------------------------------

/** Inline script tag vectors */
const SCRIPT_TAG_VECTORS = {
  inline: '<script>alert(1)</script>',
  selfClosing: '<script/>',
  withAttributes: '<script type="text/javascript">alert(1)</script>',
  mixedCase: '<ScRiPt>alert("XSS")</ScRiPt>',
  multiLine: '<script\n>alert(1)</\nscript>',
  nested: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
  withSrc: '<script src="http://attacker.example.com/xss.js"></script>',
} as const;

/** Event handler attribute vectors */
const EVENT_HANDLER_VECTORS = {
  onerrorImg: '<img src=x onerror=alert(1)>',
  onloadSvg: '<svg/onload=alert(1)>',
  onclickDiv: '<div onclick="alert(document.cookie)">click me</div>',
  onmouseoverAnchor: '<a onmouseover=alert(1)>hover</a>',
  onfocusInput: '<input onfocus=alert(1) autofocus>',
  onloadBody: '<body onload=alert(1)>',
  onstartMarquee: '<marquee onstart=alert(1)>',
} as const;

/** URI-based injection vectors */
const URI_VECTORS = {
  hrefJavascript: '<a href="javascript:alert(1)">click</a>',
  iframeJavascript: '<iframe src="javascript:alert(1)"></iframe>',
  formJavascript: '<form action="javascript:alert(1)"><input type=submit>',
  // data: URI with base64-encoded <script>alert(1)</script>
  objectDataUri:
    '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
  embedJavascript: '<embed src="javascript:alert(1)">',
} as const;

// ---------------------------------------------------------------------------

describe('InputSanitizer', () => {
  // =========================================================================
  // 1. HTML Entity Escaping
  //    Verifies each of the five OWASP-mandated characters is escaped in
  //    isolation, in combination, and across repeated occurrences.
  // =========================================================================
  describe('HTML Entity Escaping', () => {
    it('encodes less-than (<) to &lt;', () => {
      expect(sanitizeInput('<')).toBe('&lt;');
    });

    it('encodes greater-than (>) to &gt;', () => {
      expect(sanitizeInput('>')).toBe('&gt;');
    });

    it('encodes ampersand (&) to &amp;', () => {
      expect(sanitizeInput('&')).toBe('&amp;');
    });

    it('encodes double-quote (") to &quot;', () => {
      expect(sanitizeInput('"')).toBe('&quot;');
    });

    it("encodes single-quote (') to &#x27;", () => {
      expect(sanitizeInput("'")).toBe('&#x27;');
    });

    it('encodes all five characters when present in the same string', () => {
      const input = `<div class="test" data-value='foo'>bar & baz</div>`;
      const result = sanitizeInput(input);
      // No raw HTML-significant characters should remain
      expect(result).not.toMatch(/[<>"']/);
      expect(result).not.toMatch(/&(?!(lt|gt|amp|quot|#x27);)/);
      // Spot-check specific encodings
      expect(result).toContain('&lt;div');
      expect(result).toContain('&quot;test&quot;');
      expect(result).toContain('&#x27;foo&#x27;');
      expect(result).toContain('&amp; baz');
    });

    it('encodes multiple occurrences of the same character', () => {
      expect(sanitizeInput('<<<')).toBe('&lt;&lt;&lt;');
      expect(sanitizeInput('>>>')).toBe('&gt;&gt;&gt;');
      expect(sanitizeInput('&&&')).toBe('&amp;&amp;&amp;');
    });

    it('leaves regular text without HTML-significant characters unchanged', () => {
      const clean = 'Hello, World! 123 abc';
      expect(sanitizeInput(clean)).toBe(clean);
    });

    it('preserves already-valid HTML entities (no double-encoding of &)', () => {
      // The sanitizer preserves &lt;, &gt;, &amp;, &quot;, &#x27; to stay idempotent
      expect(sanitizeInput('&lt;')).toBe('&lt;');
      expect(sanitizeInput('&gt;')).toBe('&gt;');
      expect(sanitizeInput('&amp;')).toBe('&amp;');
      expect(sanitizeInput('&quot;')).toBe('&quot;');
      expect(sanitizeInput('&#x27;')).toBe('&#x27;');
    });
  });

  // =========================================================================
  // 2. Script Tag Neutralization
  //    Verifies that script tags in all common evasion forms are neutralized
  //    (rendered as inert escaped text rather than executable markup).
  // =========================================================================
  describe('Script Tag Neutralization', () => {
    it('neutralizes an inline <script>...</script> tag', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.inline);
      expect(result).not.toMatch(/<script>/i);
      expect(result).toContain('&lt;script&gt;');
    });

    it('neutralizes a self-closing <script/> tag', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.selfClosing);
      expect(result).not.toMatch(/<script/i);
      expect(result).toContain('&lt;script');
    });

    it('neutralizes a <script> tag with type attribute', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.withAttributes);
      expect(result).not.toMatch(/<script/i);
      expect(result).toContain('&lt;script');
    });

    it('neutralizes a mixed-case <ScRiPt> tag', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.mixedCase);
      expect(result).not.toMatch(/<ScRiPt>/i);
      expect(result).toContain('&lt;ScRiPt&gt;');
    });

    it('neutralizes a multi-line <script> tag', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.multiLine);
      expect(result).not.toMatch(/<script/i);
      // The newline characters should be preserved
      expect(result).toContain('\n');
    });

    it('neutralizes a nested script tag obfuscation payload', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.nested);
      expect(result).not.toMatch(/<[Ss][Cc][Rr][Ii][Pp][Tt]/);
    });

    it('neutralizes an external <script src=...> injection', () => {
      const result = sanitizeInput(SCRIPT_TAG_VECTORS.withSrc);
      expect(result).not.toMatch(/<script/i);
      expect(result).toContain('&lt;script');
    });
  });

  // =========================================================================
  // 3. Event Handler Vectors
  //    Verifies that HTML event handler attributes and javascript:/data: URIs
  //    are neutralized by encoding the surrounding angle brackets and quotes.
  // =========================================================================
  describe('Event Handler Vectors', () => {
    it('neutralizes onerror event in <img> tag', () => {
      const result = sanitizeInput(EVENT_HANDLER_VECTORS.onerrorImg);
      expect(result).not.toMatch(/<img/i);
      expect(result).toContain('&lt;img');
    });

    it('neutralizes onload event in <svg> tag', () => {
      const result = sanitizeInput(EVENT_HANDLER_VECTORS.onloadSvg);
      expect(result).not.toMatch(/<svg/i);
      expect(result).toContain('&lt;svg');
    });

    it('neutralizes onclick event in <div> tag', () => {
      const result = sanitizeInput(EVENT_HANDLER_VECTORS.onclickDiv);
      expect(result).not.toMatch(/<div/i);
      expect(result).toContain('&lt;div');
    });

    it('neutralizes onmouseover event in <a> tag', () => {
      const result = sanitizeInput(EVENT_HANDLER_VECTORS.onmouseoverAnchor);
      expect(result).not.toMatch(/<a /i);
      expect(result).toContain('&lt;a ');
    });

    it('neutralizes onfocus+autofocus in <input> tag', () => {
      const result = sanitizeInput(EVENT_HANDLER_VECTORS.onfocusInput);
      expect(result).not.toMatch(/<input/i);
      expect(result).toContain('&lt;input');
    });

    it('neutralizes javascript: protocol URI in <a href>', () => {
      const result = sanitizeInput(URI_VECTORS.hrefJavascript);
      expect(result).not.toMatch(/<a /i);
      // The angle brackets are encoded; the javascript: string itself is inert as plain text
      expect(result).toContain('&lt;a');
      expect(result).toContain('&quot;javascript:alert(1)&quot;');
    });

    it('neutralizes javascript: protocol URI in <iframe src>', () => {
      const result = sanitizeInput(URI_VECTORS.iframeJavascript);
      expect(result).not.toMatch(/<iframe/i);
      expect(result).toContain('&lt;iframe');
    });

    it('neutralizes data: URI with base64 payload in <object>', () => {
      const result = sanitizeInput(URI_VECTORS.objectDataUri);
      expect(result).not.toMatch(/<object/i);
      expect(result).toContain('&lt;object');
    });

    it('neutralizes javascript: URI in <embed src>', () => {
      const result = sanitizeInput(URI_VECTORS.embedJavascript);
      expect(result).not.toMatch(/<embed/i);
      expect(result).toContain('&lt;embed');
    });
  });

  // =========================================================================
  // 4. Boundary Conditions
  //    Verifies graceful handling of edge-case inputs: null, undefined, empty
  //    string, whitespace-only, single character, and maximum-length input.
  // =========================================================================
  describe('Boundary Conditions', () => {
    it('returns empty string for null input without throwing', () => {
      expect(sanitizeInput(null)).toBe('');
    });

    it('returns empty string for undefined input without throwing', () => {
      expect(sanitizeInput(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('preserves whitespace-only strings without trimming or modification', () => {
      const whitespace = '   \n\t  \r  ';
      expect(sanitizeInput(whitespace)).toBe(whitespace);
    });

    it('sanitizes a single HTML-significant character correctly', () => {
      expect(sanitizeInput('<')).toBe('&lt;');
      expect(sanitizeInput('>')).toBe('&gt;');
      expect(sanitizeInput('&')).toBe('&amp;');
      expect(sanitizeInput('"')).toBe('&quot;');
      expect(sanitizeInput("'")).toBe('&#x27;');
    });

    it('processes a 100,000-character input without truncation or corruption', () => {
      // Build a 100 000-character string that includes every type of special character
      // so the slow path (entity replacement) is exercised throughout.
      const chunk = '<script>alert("XSS & test \'payload\'")</script>'; // 47 chars
      const repetitions = Math.ceil(100_000 / chunk.length);
      const largeInput = chunk.repeat(repetitions).slice(0, 100_000);

      expect(largeInput.length).toBe(100_000);

      const result = sanitizeInput(largeInput);

      // No raw HTML-significant characters should remain
      expect(result).not.toMatch(/[<>"']/);
      // The output must be longer than the input (entities expand characters)
      expect(result.length).toBeGreaterThan(100_000);
    });

    it('handles non-string primitive types without throwing', () => {
      expect(sanitizeInput(0)).toBe('');
      expect(sanitizeInput(false)).toBe('');
      expect(sanitizeInput(true)).toBe('');
      expect(sanitizeInput(NaN)).toBe('');
    });

    it('handles non-string reference types without throwing', () => {
      expect(sanitizeInput({})).toBe('');
      expect(sanitizeInput([])).toBe('');
      expect(sanitizeInput(() => {})).toBe('');
    });
  });

  // =========================================================================
  // 5. Unicode Handling
  //    Verifies that Unicode characters (emoji, CJK, RTL, zero-width, combining
  //    marks) pass through unmodified when they contain no HTML-significant
  //    characters, and are still safely escaped when combined with HTML chars.
  // =========================================================================
  describe('Unicode Handling', () => {
    it('preserves emoji characters unmodified', () => {
      const emoji = '🎉🔐🚀🌍💻🛡️';
      expect(sanitizeInput(emoji)).toBe(emoji);
    });

    it('preserves CJK (Chinese/Japanese/Korean) characters unmodified', () => {
      const cjk = 'こんにちは 你好 안녕하세요';
      expect(sanitizeInput(cjk)).toBe(cjk);
    });

    it('preserves Arabic (RTL) text unmodified', () => {
      const arabic = 'مرحبا بالعالم';
      expect(sanitizeInput(arabic)).toBe(arabic);
    });

    it('preserves Hebrew (RTL) text unmodified', () => {
      const hebrew = 'שלום עולם';
      expect(sanitizeInput(hebrew)).toBe(hebrew);
    });

    it('preserves zero-width characters (U+200B, U+FEFF) unmodified', () => {
      // These characters can be used to bypass naive pattern matchers
      const zwsp = '​'; // Zero-Width Space
      const bom = '﻿';  // Zero-Width No-Break Space (BOM)
      expect(sanitizeInput(zwsp)).toBe(zwsp);
      expect(sanitizeInput(bom)).toBe(bom);
      // Mixed into a normal string
      const mixed = `hel​lo﻿`;
      expect(sanitizeInput(mixed)).toBe(mixed);
    });

    it('preserves combining diacritical marks unmodified', () => {
      // U+0301 COMBINING ACUTE ACCENT — appears on the preceding base char
      const combining = 'café'; // "café" with a combining accent
      expect(sanitizeInput(combining)).toBe(combining);
    });

    it('handles null byte (U+0000) without throwing or corruption', () => {
      const withNull = 'before after';
      const result = sanitizeInput(withNull);
      expect(result).toBe(withNull); // null byte has no HTML significance
    });

    it('encodes HTML-significant characters within a Unicode string', () => {
      // CJK text with an embedded script tag
      const input = 'こんにちは <script>alert(1)</script> 世界';
      const result = sanitizeInput(input);
      // Unicode portions unchanged; HTML chars encoded
      expect(result).toContain('こんにちは');
      expect(result).toContain('世界');
      expect(result).not.toMatch(/<script>/i);
      expect(result).toContain('&lt;script&gt;');
    });

    it('encodes HTML-significant characters within an emoji string', () => {
      const input = '🔐 <b>security</b> & 🛡️';
      const result = sanitizeInput(input);
      expect(result).toContain('🔐');
      expect(result).toContain('🛡️');
      expect(result).not.toMatch(/[<>]/);
      expect(result).toContain('&lt;b&gt;');
      expect(result).toContain('&amp;');
    });
  });

  // =========================================================================
  // 6. Performance
  //    Verifies that the sanitizer meets its SLA: a 100 000-character string
  //    containing mixed special characters must complete in under 50 ms.
  //    (This test is intentionally lenient to avoid flakiness in slow CI envs.)
  // =========================================================================
  describe('Performance', () => {
    it('sanitizes a 100,000-character mixed-special-character string in under 50ms', () => {
      // Build worst-case input: every character requires entity replacement
      const specialChunk = '<>&"\''; // 5 chars — every one triggers encoding
      const filler = 'abcdefghij'; // 10 clean chars between specials
      const unit = specialChunk + filler; // 15 chars per unit
      const repetitions = Math.ceil(100_000 / unit.length);
      const largeInput = (specialChunk + filler).repeat(repetitions).slice(0, 100_000);

      expect(largeInput.length).toBe(100_000);

      const start = performance.now();
      const result = sanitizeInput(largeInput);
      const elapsed = performance.now() - start;

      // Correctness: no raw HTML-significant characters remain
      expect(result).not.toMatch(/[<>"']/);
      // Performance SLA: must complete in under 50 ms
      expect(elapsed).toBeLessThan(50);
    });
  });

  // =========================================================================
  // 7. Idempotency
  //    Verifies that sanitizing an already-sanitized string produces identical
  //    output (no double-encoding of entities).  This confirms:
  //      - The sanitizer does NOT have a decode step that could be exploited.
  //      - Running the sanitizer twice on the same input is safe.
  //
  //    NOTE ON DOUBLE-ENCODING:
  //    The implementation uses entity-preserving logic for '&': it only encodes
  //    a bare '&' that is NOT already part of a valid HTML entity (e.g. &lt;,
  //    &amp;, &#x27;).  Therefore sanitize(sanitize(input)) === sanitize(input)
  //    for all inputs.  This is the correct contract for a one-way sanitizer.
  // =========================================================================
  describe('Idempotency', () => {
    it('produces identical output on the second pass for plain text', () => {
      const input = 'Hello, World!';
      const first = sanitizeInput(input);
      const second = sanitizeInput(first);
      expect(second).toBe(first);
    });

    it('produces identical output on the second pass for HTML entity characters', () => {
      const inputs = ['<', '>', '&', '"', "'"];
      inputs.forEach((char) => {
        const first = sanitizeInput(char);
        const second = sanitizeInput(first);
        expect(second).toBe(first);
      });
    });

    it('produces identical output on the second pass for a complex XSS vector', () => {
      const vector = '<script>alert("XSS & \'payload\'")</script>';
      const first = sanitizeInput(vector);
      const second = sanitizeInput(first);
      expect(second).toBe(first);
    });

    it('produces identical output on the second pass for all event-handler vectors', () => {
      Object.values(EVENT_HANDLER_VECTORS).forEach((vector) => {
        const first = sanitizeInput(vector);
        const second = sanitizeInput(first);
        expect(second).toBe(first);
      });
    });

    it('does NOT decode already-escaped entities (no reverse decode step)', () => {
      // If a decode step existed, sanitize('&lt;') might return '<'.
      // Correct behavior: leave already-encoded entities untouched.
      expect(sanitizeInput('&lt;')).toBe('&lt;');
      expect(sanitizeInput('&gt;')).toBe('&gt;');
      expect(sanitizeInput('&amp;')).toBe('&amp;');
      expect(sanitizeInput('&quot;')).toBe('&quot;');
      expect(sanitizeInput('&#x27;')).toBe('&#x27;');
    });

    it('does not double-encode a string that is already fully sanitized', () => {
      // Build a fully-sanitized string by encoding a known input
      const raw = '<b>Hello & "World"</b>';
      const sanitized = sanitizeInput(raw);
      // A second pass must not further expand the entities
      expect(sanitizeInput(sanitized)).toBe(sanitized);
    });

    it('handles the edge case of &amp;lt; (already double-encoded input)', () => {
      // &amp;lt; → the '&amp;' is a valid entity, so '&' is preserved;
      // 'lt;' contains no HTML-significant chars → output is unchanged.
      const doubleEncoded = '&amp;lt;';
      expect(sanitizeInput(doubleEncoded)).toBe(doubleEncoded);
    });
  });
});
