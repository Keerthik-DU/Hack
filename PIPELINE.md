# AirGap Scanner — Forge Shipping Engine Pipeline

This document describes the CI/CD pipeline configuration for AirGap Scanner,
managed in `forge-pipeline.yml`. It covers pipeline stages, security scanner
configurations, quality gate thresholds, allowlist rationale, and escalation
contacts for infrastructure failures.

---

## Pipeline Overview

```
[Source Trigger] → [Build Stage] → [Security Scan Stage] → [Push Stage] → [Deploy Stage]
```

All stages are defined in `forge-pipeline.yml`. The **Security Scan Stage** is a
blocking gate: **all four scanners must pass** before the pipeline proceeds to Push.

---

## Stage 1: Source Trigger

- **Triggers:** Push to `main` branch; Pull Request (opened, synchronize)
- **Provider:** Git

---

## Stage 2: Build Stage

- **Step catalog entry:** `build:node` (Node 20)
- **Commands:**
  1. `npm ci --ignore-scripts` — secure install, prevents post-install script attacks (OWASP A03)
  2. `npx tsc --noEmit` — TypeScript strict-mode type checking
  3. `npx vite build` — production build (tree-shaking, code splitting, Worker bundle)
  4. `bash scripts/verify-manifest.sh` — verifies `model-manifest.json` in `dist/`
- **Timeout:** 2 minutes
- **Artifacts:** `dist/` directory with commit SHA and build timestamp metadata

---

## Stage 3: Security Scan Stage (WO-067)

All four scanners run **in parallel** within a single 5-minute timeout budget.
The wall-clock time equals the slowest individual scanner.

**AND gate logic:** The pipeline proceeds to the Push stage only if **all four**
quality gates pass. A failure in any single scanner blocks the pipeline.

### Scanner 1: SonarQube — Static Analysis & Code Quality

| Property | Value |
|----------|-------|
| Config file | `sonar-project.properties` |
| Step | `scan:sonarqube` |
| Source directory | `src/` |
| Exclusions | `node_modules/`, `dist/`, `coverage/`, test files |
| Quality gate | Zero critical issues, zero blocker issues |
| Gate enforcement | `sonar.qualitygate.wait=true`, 300s timeout |

**What SonarQube checks:**
- Cognitive complexity thresholds
- Security hotspots (hardcoded credentials, SQL injection vectors, XSS sinks)
- Code smells and maintainability issues
- TypeScript-specific patterns via `tsconfig.json`

**Failure output:** Links directly to the SonarQube dashboard with the project
key `airgap-scanner`. Each finding shows file path, line number, issue type,
and severity.

**Infrastructure failure:** If the SonarQube server is unavailable, the pipeline
fails with an infrastructure error message. Do NOT re-run to bypass — contact
the platform team.

---

### Scanner 2: Snyk — Dependency Vulnerability Scanning (SCA)

| Property | Value |
|----------|-------|
| Step | `scan:snyk` |
| Manifest files | `package.json`, `package-lock.json` |
| Severity threshold | `high` (fails on critical and high CVEs) |
| Transitive deps | Included (`include_transitive: true`) |
| Quality gate | Zero critical CVEs, zero high CVEs |

**What Snyk checks:**
- Direct npm dependencies (production and devDependencies)
- Transitive (indirect) dependencies
- Known CVEs from the Snyk vulnerability database
- License compliance (advisory only, not gating)

**Decision on devDependencies:** Snyk gates on **all** dependencies including
`devDependencies`. While devDependencies are not shipped to production, they
run during the build process and are a valid supply chain attack vector (OWASP A03).
A compromised build tool can tamper with production artifacts.

**Failure output:** Lists each vulnerable package with the CVE ID, affected
version range, severity, and recommended upgrade version.

**Infrastructure failure:** If the Snyk API times out, the pipeline fails with
an infrastructure error. Do NOT re-run to bypass.

---

### Scanner 3: Gitleaks — Secret Scanning

| Property | Value |
|----------|-------|
| Config file | `.gitleaks.toml` |
| Step | `scan:gitleaks` |
| Ruleset | Default Gitleaks ruleset (extends `useDefault = true`) |
| Quality gate | Zero findings |

**What Gitleaks checks:**
- AWS access keys and secret access keys
- GitHub personal access tokens and app tokens
- Google API keys, GCP service account keys
- Stripe, Twilio, SendGrid, and other SaaS API keys
- Generic high-entropy strings matching credential patterns
- Private keys (RSA, EC, PGP)

**Failure output:** File path, line number, match excerpt, and detected secret type.

**On detection:** Remove the secret from the codebase, **rotate the compromised
credential immediately** (treat it as fully compromised), and rewrite git history
with `git filter-branch` or BFG Repo Cleaner. Contact the Security team.

**Infrastructure failure:** If the Gitleaks binary is unavailable, the pipeline
fails with an infrastructure error. Do NOT re-run to bypass.

#### Allowlist Rationale

AirGap Scanner is itself a secret detection tool. Its test suite contains
intentional example secret patterns used to validate the regex detection engine.
These are synthetic test inputs — they match the format of real secrets but use
obviously fake values (e.g., `AKIA1234567890EXAMPLEKEY1`).

The `.gitleaks.toml` allowlist restricts exceptions to specific test directories
only. **No allowlist entry covers production source files.**

| Allowlisted path | Rationale |
|-----------------|-----------|
| `src/__tests__/fixtures/` | Fake AWS keys and tokens as orchestrator/scorer test inputs |
| `src/engines/__tests__/` | Expected match inputs for regex pattern validation |
| `src/engines/entropy/__tests__/` | Synthetic high-entropy strings for entropy threshold tests |
| `src/orchestration/__fixtures__/` | Code samples with credential patterns for pipeline tests |
| `src/hooks/__fixtures__/` | Mock finding objects with fake secret values for UI tests |
| `src/test/fixtures/` | Shared integration test fixtures with synthetic findings |
| `src/patterns/v1/patterns.json` | Regex pattern source file (contains detection patterns, not secrets) |
| `src/engines/regex/patterns.json` | Regex pattern source file (contains detection patterns, not secrets) |
| `package-lock.json` | Deterministic npm lock file with integrity hashes (not credentials) |

**To add a new allowlist entry:** Open `.gitleaks.toml`, add an `[[allowlists]]`
block with a `description` explaining why the path is safe to exclude, and open
a PR for Security team review.

---

### Scanner 4: Semgrep — SAST for TypeScript/React

| Property | Value |
|----------|-------|
| Config file | `.semgrep.yml` |
| Step | `scan:semgrep` |
| Languages | TypeScript (covers `.ts` and `.tsx`) |
| Quality gate | Zero ERROR severity, zero WARNING severity |

**What Semgrep checks (rules defined in `.semgrep.yml`):**

| Rule ID | Severity | Description |
|---------|----------|-------------|
| `react-dangerously-set-inner-html` | ERROR | `dangerouslySetInnerHTML` usage (XSS risk) |
| `no-eval` | ERROR | `eval()` calls (code injection) |
| `no-new-function` | ERROR | `new Function()` calls (code injection) |
| `no-settimeout-string` | ERROR | `setTimeout("string", ...)` (code injection) |
| `no-setinterval-string` | ERROR | `setInterval("string", ...)` (code injection) |
| `no-innerhtml-template-literal` | ERROR | `innerHTML = \`...\`` with variable interpolation (XSS) |
| `no-innerhtml-concat` | ERROR | `innerHTML = string + variable` (XSS) |
| `postmessage-wildcard-origin` | WARNING | `postMessage(data, "*")` (data leakage) |
| `missing-message-origin-check` | WARNING | `addEventListener('message', ...)` without origin validation |
| `no-prototype-pollution` | ERROR | `__proto__` assignment (prototype pollution) |

**Failure output:** Rule ID, file path, line number, code excerpt, and security
concern description.

**False-positive exceptions for Web Worker postMessage:**
The Web Worker communication layer (`src/workers/llm-worker.ts`) uses
`postMessage` with `'*'` and message event listeners without explicit origin
checks. This is safe because Web Workers are same-origin by browser enforcement —
a Web Worker cannot be loaded from a different origin. These specific usages
are suppressed with inline comments:

```typescript
// nosemgrep: postmessage-wildcard-origin — Web Worker: same-origin guaranteed by browser
self.postMessage(result, '*');

// nosemgrep: missing-message-origin-check — Web Worker: cross-origin not possible
self.addEventListener('message', (event) => { ... });
```

**To add a new rule exception:** Add `// nosemgrep: <rule-id>` on the flagged
line with a brief comment explaining the safety rationale. All nosemgrep
suppressions are reviewed in PR code review.

---

## Quality Gate Summary

| Scanner | Gate Condition | Failure Action |
|---------|---------------|----------------|
| SonarQube | Zero critical issues, zero blocker issues | Block pipeline, link to dashboard |
| Snyk | Zero critical CVEs, zero high CVEs (all deps, including transitive) | Block pipeline, list CVEs with fix versions |
| Gitleaks | Zero secret findings | Block pipeline, show path + line + secret type |
| Semgrep | Zero ERROR findings, zero WARNING findings | Block pipeline, show rule ID + file + line |

All gates use AND logic. **Every gate must pass.** A single failure in any
scanner blocks the pipeline and prevents progression to the Push stage.

---

## 5-Minute Timeout Target

All four scanners run in **parallel** within a shared 5-minute timeout. The
total wall-clock time equals the duration of the slowest individual scanner,
not the sum of all scanners. This meets the ≤5-minute stage duration requirement.

Approximate scanner durations for the AirGap Scanner codebase at current size:

| Scanner | Estimated Duration |
|---------|--------------------|
| SonarQube | 60–120 seconds |
| Snyk | 30–60 seconds |
| Gitleaks | 10–30 seconds |
| Semgrep | 20–60 seconds |
| **Total (parallel)** | **≤120 seconds** |

---

## Scan Results in Forge Dashboard

All four scanners are configured to publish their results to the Forge pipeline
dashboard. Results are accessible:

- **SonarQube:** Linked dashboard URL with per-issue detail
- **Snyk:** Vulnerability report with CVE links and remediation advice
- **Gitleaks:** Secret finding report with file paths and line numbers
- **Semgrep:** SAST finding report with rule descriptions and code excerpts

---

## Infrastructure Failure Handling

If a scanner service is temporarily unavailable (SonarQube server down, Snyk API
timeout, Semgrep service error), the pipeline **fails with a clear infrastructure
error message** rather than silently passing. Infrastructure failures are
distinguished from finding failures in the pipeline output.

**Do NOT re-run the pipeline to bypass an infrastructure failure.** Contact the
platform team to restore the affected scanner service before re-running.

---

## Escalation Contacts

| Scenario | Contact |
|----------|---------|
| SonarQube server down | Platform team |
| Snyk API timeout or license issue | Platform team |
| Gitleaks binary unavailable | Platform team |
| Semgrep service unavailable | Platform team |
| Real secret detected by Gitleaks | Security team (treat as incident) |
| High/critical CVE found by Snyk | Security team + engineering lead |
| Critical SonarQube finding | Engineering lead |
| Semgrep SAST finding | Assigned developer (via PR comment) |

---

## Stage 4: Zero-Network E2E (WO-050)

Blocking `test:generic` stage that runs the Playwright zero-network suite
(`npm run test:e2e:network`) after Build and Security Scan succeed.

| Property | Value |
|----------|-------|
| Step | `test:generic` |
| Stage name | `zero-network-e2e` |
| Command | `npm run test:e2e:network` |
| Browsers | Chromium + WebKit |
| Gate | Any scan-phase network request fails the stage and blocks promotion |

### Local / CI usage

```bash
# Install browsers once
npx playwright install chromium webkit

# Build + run only the zero-network suite (starts Vite preview via playwright.config.ts)
npm run test:e2e:network:ci
```

Forge Shipping integration: keep the `zero-network-e2e` stage in
`forge-pipeline.yml` with `step: test:generic` and `on_failure.block_pipeline: true`.
JSON summaries are written under `test-results/network-reports/` (load vs scan
request counts) for auditability.

---

## Stage 5: Artifact Push Stage (WO-068)

Runs **only after** Security Scan and Zero-Network E2E pass. Uploads the
verified `dist/` bundle to the Forge artifact registry with SHA-256 integrity
checksums and commit-SHA version tags (OWASP A08 supply-chain integrity).

| Property | Value |
|----------|-------|
| Step | `push:generic` |
| Artifact source | `dist/` |
| Version tag | Short commit SHA (`COMMIT_SHA_SHORT`, 7–8 chars) |
| Immutability | `immutable: true`, `fail_on_duplicate_tag: true` |
| Timeout | 1 minute |
| Checksum algorithm | SHA-256 only (no MD5 / SHA-1) |

### Push commands (in order)

1. `bash scripts/verify-manifest.sh` — defense-in-depth re-check that
   `dist/model-manifest.json` exists. `SKIP_MANIFEST_CHECK` is forced to
   `false` in this stage; a missing manifest fails the push.
2. `bash scripts/generate-checksums.sh` — hashes every file under `dist/` and
   writes `checksums.sha256` at the repository root (not inside `dist/`) in
   the format `hash  filepath` (one line per file). Empty `dist/` fails with
   a clear validation error.

### Pipeline metadata recorded on push

| Field | Source |
|-------|--------|
| `commit_sha` | Full VCS commit SHA |
| `commit_sha_short` / `artifact_version_tag` | Short commit SHA (version tag) |
| `build_timestamp` | ISO 8601 pipeline timestamp |
| `artifact_registry_url` | Registry URL from Forge pipeline context |
| `checksums_manifest` / `checksums_manifest_file` | Contents / path of `checksums.sha256` |

### Retrieving artifacts for rollback

Artifacts are addressable by version tag (the short commit SHA). To roll back:

1. Locate the prior known-good commit SHA.
2. Retrieve the artifact bundle from the registry using that short SHA tag.
3. Independently recompute SHA-256 hashes of the retrieved files and compare
   them to the `checksums_manifest` recorded in pipeline metadata — they must
   match exactly before promoting the rollback bundle.

### Immutability / duplicate tags

Pushing the same version tag twice is rejected (`fail_on_duplicate_tag: true`).
Artifacts are immutable once published. Concurrent pipeline runs for different
commits use distinct SHA-derived tags and do not overwrite each other.

### Failure modes

| Failure | Type | Action |
|---------|------|--------|
| Missing `model-manifest.json` | Validation | Fix Build/public asset copy; do not skip the gate |
| Empty `dist/` | Validation | Re-run Build; inspect Vite output |
| Checksum hash failure | Validation | Fix the reported file path / permissions |
| Duplicate version tag | Validation | Use a new commit, or retrieve the existing tag |
| Registry unavailable / timeout | Infrastructure | Contact platform team; retry after recovery |

---

## Configuration Files Reference

| File | Purpose |
|------|---------|
| `forge-pipeline.yml` | Main pipeline definition (all stages) |
| `sonar-project.properties` | SonarQube project key, source paths, exclusions, quality gate |
| `.gitleaks.toml` | Gitleaks ruleset extension and test-fixture allowlists |
| `.semgrep.yml` | Semgrep SAST rules for TypeScript/React security patterns |
| `scripts/verify-manifest.sh` | Build/Push gate: require `dist/model-manifest.json` |
| `scripts/generate-checksums.sh` | Push stage: SHA-256 manifest for all `dist/` files |
| `playwright.config.ts` | Playwright E2E config (Chromium/WebKit, 60s timeout) |
| `tests/e2e/zero-network.spec.ts` | WO-050 zero-network invariant suite |
| `PIPELINE.md` | This document — pipeline documentation and runbook |
