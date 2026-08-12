# AirGap Scanner Data Classification Policy

| Field | Value |
| --- | --- |
| **Document title** | AirGap Scanner Data Classification Policy |
| **Version** | 1.0 |
| **Last updated** | 2026-08-12 |
| **Owner** | AirGap Scanner Engineering / Security |

---

## 1. Overview

AirGap Scanner is a local, in-browser web application that scans pasted text (code, logs, configs, error traces) for secrets and credentials before that text is sent to AI chat tools or any third party. Detection runs entirely in the browser using deterministic regex matching, high-entropy analysis, and — when available — a small quantized LLM via WebGPU.

**Zero-trust data isolation** is a structural property of the architecture, not only a written policy:

- User content never leaves the browser tab's JavaScript heap for network transmission during scanning.
- There is no application backend that receives, stores, or logs pasted text.
- Persistence APIs (`localStorage`, `sessionStorage`, IndexedDB) are not used for user content; IndexedDB is reserved exclusively for Public-tier LLM model weights.
- Content Security Policy (CSP) headers constrain network egress so that accidental or malicious exfiltration paths are blocked at the browser layer.

Because these controls are enforced by design (CSP, memory-only user content, scoped IndexedDB usage, integrity verification), classification tiers describe **how the product already behaves**, rather than aspirational rules that operators must remember to apply.

---

## 2. Data Entity Inventory

Organization classification tiers in use: **Public**, **Internal**, **Confidential**, **Restricted**.  
AirGap Scanner currently assigns entities only to **Restricted**, **Internal**, and **Public**. The **Confidential** tier is not applicable to this product's data model (see [Section 3](#3-classification-tier-handling-rules)).

| Data Entity | Classification Tier | Storage Location | Retention Period | Access Controls | Enforcement Mechanism |
| --- | --- | --- | --- | --- | --- |
| User-pasted text | Restricted | JavaScript heap memory only | Session only — garbage collected on tab close | Available only within the active browser tab / origin; never sent to a server | CSP (`connect-src`, `script-src`, `form-action`); no `localStorage` / `sessionStorage` / IndexedDB writes for user content; GC on tab close |
| Scan findings | Restricted | JavaScript heap memory only | Session only — garbage collected on tab close | In-memory UI/state only within the active tab | No persistence APIs for findings; CSP blocks network exfiltration; GC on tab close |
| Redacted preview text | Restricted | JavaScript heap memory only | Session only — garbage collected on tab close | In-memory UI/state only within the active tab; copy is user-initiated to clipboard | Derived in-memory from pasted text + findings; no disk/IndexedDB persistence; CSP |
| LLM model weights | Public | IndexedDB (browser-managed storage) | Until version invalidation or manual clear | Readable by the application origin for inference; not treated as user secrets | Version-tagged cache entries with auto-invalidation; SRI-style SHA-256 verification before use; IndexedDB used exclusively for Public-tier weights |
| Model integrity manifest | Internal | Bundled in application JavaScript / release assets | Immutable per release | Distributed with the deployed app; verified against weights at load time | Release immutability; SHA-256 hash checks against manifest entries |
| Regex pattern rules | Internal | Bundled in application JavaScript | Immutable per release | Distributed with the deployed app; executed client-side only | Bundled release artifacts; no runtime download of pattern sets that would require user-content upload |
| Application source code | Internal | Browser cache / CDN (static assets) | Per deployment cycle | Publicly fetchable as static web assets (not user data); served as built bundles | Standard web deployment controls; CSP on script sources; no server-side processing of user paste |

---

## 3. Classification Tier Handling Rules

### 3.1 Restricted

**Applies to:** user-pasted text, scan findings, redacted preview text.

Handling rules:

- Store only in JavaScript heap memory for the lifetime of the tab session.
- Do not write Restricted data to `localStorage`, `sessionStorage`, IndexedDB, cookies, or any remote API.
- Retain only for the session: cleanup occurs when the tab is closed or the user navigates away and the heap is garbage-collected.
- Treat clipboard copy of redacted text as an explicit user action; the application does not background-sync clipboard contents.

**Edge note:** If the browser crashes, residual fragments may remain in OS swap or crash dumps outside application control. AirGap Scanner cannot scrub those OS-level artifacts; the design still avoids intentional persistence.

### 3.2 Internal

**Applies to:** model integrity manifest, regex pattern rules, application source code.

Handling rules:

- Distributed as part of the shipped application or static deployment.
- Immutable for a given release; updates ship via normal deployment / version bumps.
- Not user-generated content; must not be confused with Restricted paste data.
- Manifest and pattern rules support integrity and detection logic only; they must never be used as a channel to exfiltrate pasted text.

### 3.3 Public

**Applies to:** LLM model weights.

Handling rules:

- May be downloaded once (when needed) and cached in IndexedDB for performance on return visits.
- Retention lasts until version invalidation (new model/version tag) or the user clears site data.
- Weights are not personal data and contain no user paste content.
- Integrity must be verified (SRI-style SHA-256) before the weights are used for inference.

**Edge note:** Browser-managed IndexedDB encryption varies by platform. Model weight confidentiality at rest relies on browser-native storage protections rather than application-level encryption of the weight files.

### 3.4 Confidential — not applicable

The organization policy includes a **Confidential** tier. AirGap Scanner's data model does not introduce Confidential entities: user content is elevated to **Restricted** (session-only, heap-only), and non-user artifacts are either **Internal** (bundled app assets) or **Public** (model weights). This gap is intentional — auditors should not expect Confidential-tier rows for this product.

---

## 4. GDPR / CCPA Compliance Statement

AirGap Scanner is designed so that **no personal data is collected, transmitted, or persisted** by the application for the purpose of scanning:

- Pasted text, findings, and redacted previews exist only in the browser tab's memory and are discarded when the session ends.
- Scanning does not upload content to AirGap Scanner servers (there is no content-processing backend in this architecture).
- The only persistent client storage used by the product for its core isolation model is IndexedDB for **Public** LLM model weights, which are not personal data and are not derived from user paste.

Under GDPR and CCPA-style regimes, **the absence of personal-data collection and transmission is itself the compliance posture**: there is no personal-data inventory of scanned content to retain, no cross-border transfer of paste content by the application, and no sale or sharing of scanned text with third parties. Operators and auditors should evaluate the product against this zero-collection design rather than against a traditional server-side retention schedule for user content.

If future features introduce accounts, telemetry, or remote logging of user content, this document and the compliance posture must be revised before those features ship.

---

## 5. Enforcement Mechanisms

| Control | Purpose |
| --- | --- |
| **CSP headers** (`connect-src`, `script-src`, `form-action`, and related directives) | Prevent network exfiltration and constrain executable/script sources so scanning cannot silently post user content off-origin. |
| **No `localStorage` / `sessionStorage` / IndexedDB for user content** | Ensures Restricted entities never become durable browser storage. |
| **IndexedDB reserved for Public model weights** | Limits persistent storage to non-user, Public-tier artifacts only. |
| **Version-tagged caching with auto-invalidation** | Ensures stale or replaced model versions are not reused without an explicit new download path. |
| **SRI-style SHA-256 verification** | Confirms model weight integrity against the model integrity manifest before inference. |
| **JavaScript garbage collection on tab close** | Primary retention enforcement for Restricted heap-only data when the session ends. |

Together, these controls implement the classification and retention rules in [Section 2](#2-data-entity-inventory) without relying solely on operator procedure.

---

## 6. Audit Logging Adaptation

Traditional server-side audit logs (who accessed which record, when data was exported from a central store) are **not applicable** to AirGap Scanner's client-side architecture: there is no central datastore of pasted text or findings to audit.

Auditability for this product is adapted as follows:

- **Automated test suite** — encodes and continuously verifies isolation and integrity behaviors (for example: no persistence of user content, hash verification paths, degradation when WebGPU is unavailable).
- **CI/CD pipeline logs** — provide the build/release audit trail for what code, manifests, and pattern bundles were shipped.
- **Client-side console / diagnostic messaging** — may aid local debugging; it is not a substitute for a remote SIEM of user paste content (by design, that content is never sent to a remote log sink).

Reviewers seeking evidence of data-handling guarantees should rely on this policy, the architecture artifacts, and the test/CI trail rather than expecting server access logs of scanned text.

---

## 7. Document Control

| Item | Detail |
| --- | --- |
| Related index | [docs/README.md](./README.md) |
| Synthetic examples only | Never document real credentials; use placeholders such as `AKIAIOSFODNN7EXAMPLE` if illustrating flows elsewhere |
| Review trigger | Any change to persistence, networking, telemetry, or model caching behavior |
