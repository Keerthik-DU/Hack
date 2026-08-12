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

## 3. Reporting a Vulnerability

If you discover a security vulnerability or supply chain weakness in AirGap Scanner, please report it via security disclosure protocols. Do not open public issues for zero-day credential leakage or supply chain risks.
