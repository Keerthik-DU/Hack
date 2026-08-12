# AirGap Scanner User Guide

| Field | Value |
| --- | --- |
| **Audience** | Developers, DevOps engineers, and security professionals |
| **Version** | 1.0 |
| **Last updated** | 2026-08-12 |

AirGap Scanner helps you check pasted text (code, logs, configs, error traces) for secrets and credentials **before** you send that text to an AI chat tool or any third party. Scanning runs in your browser. Your pasted content is not uploaded to an AirGap Scanner server.

This guide walks you through the full paste-and-scan workflow: opening the app, scanning text, reading results, copying a safe redacted version, and recovering from common problems.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Scanning Your Text](#2-scanning-your-text)
3. [Understanding Results](#3-understanding-results)
4. [Using Redacted Preview](#4-using-redacted-preview)
5. [Privacy and Security](#5-privacy-and-security)
6. [Troubleshooting](#6-troubleshooting)
7. [FAQ](#7-faq)

---

## 1. Getting Started

### Browser Requirements

For the full experience (including optional on-device AI analysis when available), use a modern browser:

| Browser | Minimum version |
| --- | --- |
| Google Chrome | 113+ |
| Microsoft Edge | 113+ |
| Safari | 26+ |

**Unsupported or older browsers:** AirGap Scanner does not block you from scanning. It gracefully degrades to **regex + randomness (entropy) analysis** without the on-device AI layer. You can still paste text, run a scan, review findings, and copy redacted output. Hardware-accelerated AI analysis may be unavailable or behave differently across browser versions (especially Safari).

[SCREENSHOT: Browser compatibility or degraded-mode banner shown when hardware acceleration is unavailable]

### First Visit

On your first visit, AirGap Scanner may download a small AI model file so later scans can use contextual analysis **when your browser supports it**.

What to expect:

1. Open AirGap Scanner in a supported browser.
2. A **model progress** indicator may appear while the model downloads and is verified.
3. You do **not** need to wait for the model to finish before scanning — **regex + randomness analysis is available immediately**.
4. When the model is ready (if available on your browser), later scans can include an additional AI analysis layer.

The model file is stored locally in your browser so return visits load faster. Clearing site data will require downloading it again.

[SCREENSHOT: First-visit Model Progress Bar while the AI model downloads]

---

## 2. Scanning Your Text

Follow this workflow from opening the app to reviewing progressive results:

1. **Open AirGap Scanner** in your browser.
2. **Paste** the text you want to check into the input area (code snippets, logs, configs, or error traces).
3. **Observe the character count** so you know how large the input is (very large pastes may take longer — see [Troubleshooting](#6-troubleshooting)).
4. **Click Scan**, or wait for auto-scan if that behavior is enabled in your build.
5. **Watch progressive results** appear as each detection layer finishes (pattern matching, randomness analysis, and — if available — AI analysis).
6. **Review the verdict banner** and finding cards (or the All Clear state).
7. **Open the redacted preview** and copy safe text when you are ready to share elsewhere.

[SCREENSHOT: Main scanner layout with paste input area, character count, and Scan button]

[SCREENSHOT: Progressive scan results updating as each detection layer completes]

**Synthetic example only (not a real key):** text containing something like `AKIAIOSFODNN7EXAMPLE` may be flagged as an AWS-style access key pattern during scanning.

---

## 3. Understanding Results

### Confidence Levels

Each finding shows a confidence level with color coding:

| Level | Badge color | Meaning |
| --- | --- | --- |
| High | Red | Strong match — treat as a likely secret |
| Medium | Amber | Possible secret — review carefully |
| Low | Green | Weaker signal — often worth a quick human check |

[SCREENSHOT: Scan Results Panel showing high-confidence AWS key finding with red confidence badge]

### Detection Layer Tags

Findings can be tagged with the layer that contributed:

| Tag | Plain-language meaning |
| --- | --- |
| **Regex** | Pattern match against known secret formats |
| **Entropy** | Randomness analysis (strings that look unusually random) |
| **LLM** | Contextual AI analysis (**if available** on your browser and after the model has loaded) |

The AI layer is conditional: if hardware acceleration is unavailable, the model failed to load, or the model is still downloading, you still get regex + entropy results.

### Finding Cards

Each finding card typically shows:

- **Secret type** (for example, AWS access key)
- **Line number** in your pasted text
- **Masked preview** showing roughly the first 4 and last 4 characters (middle hidden)
- **Confidence badge** and **detection layer** tags

[SCREENSHOT: Finding card with secret type, line number, masked preview, confidence badge, and layer tags]

### Verdict Banner and All Clear

- **All Clear:** a green banner/state when no secrets were found.
- **Findings verdict:** an amber or red banner with the count of findings when secrets (or likely secrets) were detected.

[SCREENSHOT: Green All Clear verdict banner with empty findings state]

[SCREENSHOT: Amber/red verdict banner showing findings count]

---

## 4. Using Redacted Preview

The redacted preview replaces detected secrets with typed placeholders so you can share context without sharing the secret values.

Example placeholder format:

```text
[REDACTED-AWS-KEY]
```

Other types follow the same style (for example `[REDACTED-GITHUB-TOKEN]`), depending on what was detected.

How to use it:

1. After a scan with findings, open the **Redacted Preview**.
2. Confirm secrets were replaced with placeholders.
3. Use **one-click copy** to place the redacted text on your clipboard.
4. Paste that redacted text into AI chat tools or tickets instead of the original.

[SCREENSHOT: Redacted Preview panel showing [REDACTED-AWS-KEY] placeholders and Copy button]

---

## 5. Privacy and Security

AirGap Scanner is built around a **zero-trust / local-only** idea: your pasted content should not need to leave your machine for scanning.

In plain language:

- **All scanning happens in your browser.**
- **Nothing you paste is sent to an AirGap Scanner server** for analysis.
- The **Local Only** privacy badge indicates the product's intent to keep scanning local (zero network calls for your pasted content during scanning).
- **Pasted text is session-only** — it is not saved by the app for later visits and is discarded when you close the tab.
- **Only the AI model file** (not your paste) may be stored locally so return visits can skip a full re-download.

For the formal classification and retention policy, see [Data Classification Policy](./data-classification.md).

[SCREENSHOT: Status bar or header showing the Local Only privacy badge]

---

## 6. Troubleshooting

### Error States and Common Fixes

| Situation | What it means | What still works / what to do |
| --- | --- | --- |
| **WebGPU unavailable banner** | Hardware acceleration for on-device AI is not available | Regex + entropy scanning still work; AI layer may be skipped |
| **Model download failed** | The AI model could not be downloaded (network, firewall, or CDN issue) | Retry when online; confirm corporate firewall allows the model download; continue with regex + entropy |
| **Model verification failure** | The downloaded model did not pass integrity checks | Retry the download; if it keeps failing, use degraded regex + entropy mode and report to your team |
| **Browser compatibility issues** | Browser is older or lacks required features | Upgrade to Chrome 113+, Edge 113+, or Safari 26+ when possible; otherwise expect degraded mode |
| **Slow scanning on large inputs** | Inputs of ~50K–100K characters take longer | Expected; wait for progressive layers to finish |

[SCREENSHOT: WebGPU unavailable / degraded-mode banner]

[SCREENSHOT: Model download failure message with retry action]

[SCREENSHOT: Model verification failure message]

### Notes for corporate and special environments

- **Strict firewalls** may block first-visit model download. Regex + entropy still work without the model.
- **Clearing browser data** removes the cached model; the next visit may download it again.
- **Safari** may expose different hardware-acceleration behavior than Chrome/Edge; treat AI analysis as **if available**.

---

## 7. FAQ

### Is my data sent anywhere?

No. AirGap Scanner is designed so pasted text is scanned in your browser and is not uploaded to an AirGap Scanner backend for processing. See [Privacy and Security](#5-privacy-and-security).

### What browsers are supported?

Chrome 113+, Edge 113+, and Safari 26+ for the best experience. Older or unsupported browsers fall back to regex + entropy mode.

### How large can my input be?

The product targets large pastes (on the order of up to about 100K characters). Scans of 50K+ characters can take longer; that is expected.

### Can I use this offline?

After the app assets (and, if needed, the AI model) are available locally, scanning of pasted text does not require sending that text to a server. First visit typically needs network access to load the app and optionally download the model. If the model is missing, regex + entropy still work.

### What if I get false positives?

Review the finding card (type, line, masked preview, confidence). Medium/low confidence items especially deserve a human check. Adjust what you paste or remove clearly non-secret high-randomness strings when appropriate.

### How accurate is the scanning?

Regex catches known formats; randomness analysis finds odd high-entropy strings; AI analysis (**if available**) adds context. No scanner is perfect — always review findings before sharing text externally.

### What types of secrets are detected?

Common credential patterns (for example cloud access keys, tokens, and similar formats represented in the pattern set), plus high-randomness strings and optional contextual AI hits. Exact coverage grows with the pattern library and model capabilities in your build.

### Do I need to install anything?

No native install is required — use a supported browser and open AirGap Scanner. Optional: allow the first-visit model download for AI analysis when supported.

### What happens if I clear my browser data?

Your cached AI model may be removed. On the next visit you may need to download it again. Your previous pasted text was not kept by the app across sessions anyway.

### Why is the AI layer missing sometimes?

Hardware acceleration may be unavailable, the model may still be loading, download/verification may have failed, or your browser version may not support it. Scanning continues with regex + entropy.

---

## Screenshot Checklist (for designers)

Populate these placeholders when the UI is ready:

1. `[SCREENSHOT: Browser compatibility or degraded-mode banner shown when hardware acceleration is unavailable]`
2. `[SCREENSHOT: First-visit Model Progress Bar while the AI model downloads]`
3. `[SCREENSHOT: Main scanner layout with paste input area, character count, and Scan button]`
4. `[SCREENSHOT: Progressive scan results updating as each detection layer completes]`
5. `[SCREENSHOT: Scan Results Panel showing high-confidence AWS key finding with red confidence badge]`
6. `[SCREENSHOT: Finding card with secret type, line number, masked preview, confidence badge, and layer tags]`
7. `[SCREENSHOT: Green All Clear verdict banner with empty findings state]`
8. `[SCREENSHOT: Amber/red verdict banner showing findings count]`
9. `[SCREENSHOT: Redacted Preview panel showing [REDACTED-AWS-KEY] placeholders and Copy button]`
10. `[SCREENSHOT: Status bar or header showing the Local Only privacy badge]`
11. `[SCREENSHOT: WebGPU unavailable / degraded-mode banner]`
12. `[SCREENSHOT: Model download failure message with retry action]`
13. `[SCREENSHOT: Model verification failure message]`
