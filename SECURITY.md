# Security Policy & Supply Chain Security Posture

AirGap Scanner is a zero-trust, client-side secret scanner. Securing our software supply chain is paramount to ensuring user-pasted content and credentials are never exposed or exfiltrated.

## 1. Supply Chain Controls (OWASP A03 & OWASP A08)

### Lockfile Integrity Verification
- All dependencies are locked in `package-lock.json` (v2/v3 schema).
- Every resolved package entry MUST contain an `integrity` field with a cryptographic SHA-512 or SHA-1 hash.
- Automated verification script (`scripts/verify-lockfile-integrity.ts`) runs as a pre-build check (`npm run verify:lockfile`) in CI/CD pipelines to block builds if any package lacks an integrity hash.

### Ignore-Scripts Policy
- An `.npmrc` configuration enforces `ignore-scripts=true` across local development and CI environments.
- Prevents malicious or compromised third-party npm packages from executing arbitrary binary post-install lifecycle scripts (`preinstall`, `install`, `postinstall`).

### Dependency Vulnerability Scanning (SCA)
- Continuous Software Composition Analysis (SCA) via Snyk and `npm audit`.
- P0/P1 security advisories block build and deployment pipelines.

## 2. Onboarding New Dependencies

When adding or updating npm packages:
1. Run `npm install <package-name> --ignore-scripts` to add the dependency.
2. Verify that `package-lock.json` is updated and all newly resolved entries contain `integrity` hashes.
3. Run `npm run verify:lockfile` to validate lockfile integrity.
4. Run `npm run test` and `npm run build` to ensure clean execution under `ignore-scripts=true`.
5. Commit both `package.json` and `package-lock.json`.

## 3. HTTP Security Response Headers (OWASP A02 & A04)

AirGap Scanner sets the following five HTTP security response headers on every response — HTML, JavaScript, and CSS assets alike. They are defined as a single source of truth in `src/config/security-headers.ts` and applied consistently in:

- **Development**: Vite dev server plugin (`vite.config.ts`)
- **Vercel production**: `vercel.json` headers configuration
- **Netlify / Cloudflare Pages**: `public/_headers`

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS for 1 year including subdomains; `preload` makes the site eligible for browser preload lists |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing responses away from the declared `Content-Type` |
| `X-Frame-Options` | `DENY` | Legacy clickjacking defense for browsers that do not support CSP `frame-ancestors` |
| `Referrer-Policy` | `no-referrer` | Suppresses the `Referer` header entirely — no URL information leaks to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables browser APIs that AirGap Scanner never uses, reducing attack surface |

### HSTS Preload Deferral

The `Strict-Transport-Security` header includes the `preload` directive, which signals eligibility for browser-embedded HSTS preload lists. However, **actual submission to [hstspreload.org](https://hstspreload.org) has been intentionally deferred** and must NOT be performed until:

1. The production domain is confirmed to be served exclusively over HTTPS (no HTTP fallback).
2. All subdomains are also confirmed on HTTPS.
3. The decision is reviewed by the security team, because inclusion in preload lists is very difficult to reverse and may break non-HTTPS deployments indefinitely.

The `preload` directive in the header value alone does not add the domain to any list — a separate manual submission step is required. This deferral is intentional and documented to prevent premature submission.

## 4. Prohibited Security Patterns (Architecture Security Zone 2)

AirGap Scanner's Architecture Security Zone 2 (Application Boundary) prohibits code patterns that bypass Content Security Policy (CSP), defeat React's XSS protections, or accept untrusted executable input. Violations fail local lint (`npm run lint`) and CI Semgrep (`npm run semgrep` / `scan:semgrep`).

These controls map to **OWASP A05:2021 – Security Misconfiguration** (and related injection classes under A03 where dynamic code execution is involved).

| Pattern | Why prohibited | Safe alternative |
|---------|----------------|------------------|
| `dangerouslySetInnerHTML` | Bypasses React XSS escaping; raw HTML injection | Render with normal JSX children/elements |
| `eval()` | Arbitrary code execution; blocked by strict CSP | `JSON.parse` for data; static imports for code |
| `new Function()` | Equivalent to `eval()` via the Function constructor | Static functions or typed dispatch tables |
| `setTimeout` / `setInterval` with a string | Implied `eval`; blocked by CSP | Pass a function callback: `setTimeout(() => { ... }, ms)` |
| `javascript:` URLs (`no-script-url`) | Executes script via navigation/URL handlers | Use https URLs or application routers |
| Template literals / concat into `innerHTML` / `outerHTML` | DOM XSS sink for untrusted data | `textContent`, `createElement`, or React JSX |
| `postMessage(..., '*')` or message handlers without `event.origin` checks | Cross-origin message injection / data leakage | Explicit target origin + validate `event.origin` |

### Enforcement

- **ESLint** (`eslint.config.js`): `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`, `react/no-danger`, `@typescript-eslint/no-implied-eval` — all at **error** severity.
- **Semgrep** (`.semgrep.yml`): custom rules for the patterns above, including DOM sinks and postMessage origin validation.
- **Fixture verification**: `npm run lint:security-verify` runs ESLint against intentional violations under `tests/fixtures/prohibited-patterns/` (those fixtures are ignored by the main `lint` run).

### Requesting an exception

Legitimate exceptions are rare. If one is required:

1. Document the threat model, why no safe alternative works, and residual risk.
2. Prefer the smallest possible surface (no user-controlled strings in the sink).
3. Add an inline `# nosemgrep: <rule-id>` (Semgrep) or targeted ESLint disable with justification — never a file-wide disable.
4. Get security-team review before merging.

Dynamic `import()` is **not** prohibited — it is a legitimate ES module feature and must not be confused with `eval()`.

## 5. Reporting a Vulnerability

If you discover a security vulnerability or supply chain weakness in AirGap Scanner, please report it via security disclosure protocols. Do not open public issues for zero-day credential leakage or supply chain risks.
