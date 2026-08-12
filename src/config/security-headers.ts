/**
 * HTTP Security Response Headers for AirGap Scanner.
 *
 * These five headers harden the application against common web attack vectors
 * (OWASP A02 — Security Misconfiguration, OWASP A04 — Insecure Design).
 *
 * They are applied in three places:
 *   1. Vite dev server (vite.config.ts) — for local development consistency
 *   2. vercel.json — for Vercel production hosting
 *   3. public/_headers — for Netlify / Cloudflare Pages hosting
 *
 * HSTS preload note: The `preload` directive is included in the header value,
 * but actual submission to the HSTS preload list at hstspreload.org has been
 * intentionally deferred. Preload list submission must NOT be performed until
 * the domain is confirmed to always serve exclusively over HTTPS, as it is
 * very difficult to reverse once the domain appears on browser preload lists.
 */

/**
 * All five required HTTP security response headers, keyed by header name.
 *
 * - Strict-Transport-Security: enforces HTTPS for 1 year, including subdomains.
 *   The `preload` directive is present for future preload list eligibility but
 *   submission to hstspreload.org is deferred — see the note above.
 * - X-Content-Type-Options: prevents browsers from MIME-sniffing responses away
 *   from the declared Content-Type (e.g. serving a script as text/plain).
 * - X-Frame-Options: legacy clickjacking defense; supplements the CSP
 *   `frame-ancestors 'none'` directive for older browsers that do not support CSP.
 * - Referrer-Policy: ensures no URL information (path, query parameters) leaks
 *   to third-party servers via the Referer request header when navigating away or
 *   loading external resources.
 * - Permissions-Policy: disables browser feature APIs that AirGap Scanner never
 *   uses, reducing the attack surface exposed to potentially injected third-party
 *   content. Uses the standardized syntax (`camera=()` not `camera 'none'`).
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
