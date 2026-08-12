# AirGap Scanner — Hackathon Demo Script (30 minutes)

**Audience:** Opsera Internal Hackathon judges & engineers  
**Goal:** Sub-60s scans, zero crashes, ≥80% “impressive” ratings  
**Branch:** `feature/forge-keerthik`

## Pre-Demo Checklist

1. Chrome/Edge latest with WebGPU enabled (`chrome://gpu`)
2. Model cached (first-visit download completed offline)
3. Open each file under `docs/demo-samples/` once
4. Clear Network tab; disable notifications
5. Backup browser window pre-loaded on mid-range laptop
6. USB with screenshots if projector fails

## Timed Script

| Window | Segment |
|--------|---------|
| 0:00–2:00 | Introduction — problem (secrets pasted into AI chats) |
| 2:00–5:00 | Architecture Overview — zero-trust, three layers |
| 5:00–10:00 | First Scan Demo — AWS + GitHub samples |
| 10:00–15:00 | Multi-Secret Demo — `mixed-secrets-sample.txt` |
| 15:00–18:00 | Network Audit — DevTools proof of zero outbound |
| 18:00–21:00 | Entropy Detection — `high-entropy-sample.txt` |
| 21:00–23:00 | All Clear — `clean-text-sample.txt` |
| 23:00–28:00 | Audience Interaction — live paste |
| 28:00–30:00 | Wrap-up — roadmap & Q&A |

### 0:00–2:00 Introduction
Open AirGap Scanner. State: “Nothing you paste leaves this tab.”

### 2:00–5:00 Architecture Overview
Cover Regex → Entropy → LLM layers; IndexedDB model cache; CSP.

### 5:00–10:00 First Scan Demo
Paste `aws-key-sample.txt`, Scan (<60s). Then `github-token-sample.txt` and `stripe-key-sample.txt`.

### 10:00–15:00 Multi-Secret Demo
Paste `mixed-secrets-sample.txt`. Highlight progressive findings and redacted preview.

### 15:00–18:00 Network Audit Demonstration
1. Open DevTools → Network; clear log  
2. Filter All  
3. Paste `ssh-key-sample.txt` and Scan  
4. Show **zero outbound requests during scan phase** (`data-scan-phase=active`)  
5. Call out Playwright zero-network suite (WO-050)

### 18:00–21:00 Entropy Detection Demo
Paste `high-entropy-sample.txt`. Explain Layer 3 Shannon entropy.

### 21:00–23:00 All Clear Demo
Paste `clean-text-sample.txt`. Show green All Clear state.

### 23:00–28:00 Audience Interaction
Invite attendees to paste their own configs (warn: synthetic preferred).

### 28:00–30:00 Wrap-up
Recap privacy guarantees; point to docs and ADR folder.

## Zero-Trust Architecture Talking Points

1. All processing happens in the browser tab — no application server.  
2. CSP + security headers block data exfiltration channels.  
3. Session-only retention — paste text never written to durable storage.  
4. No analytics / error beacons that could leak content.  
5. Privacy is verifiable via DevTools Network audit during scan.  
6. Model weights integrity-checked with SHA-256 (manifest).

## Fallback Plans

| Failure | Plan |
|---------|------|
| WebGPU unavailable | Demo regex + entropy only; show DegradationBanner |
| Model download failure | Use pre-cached IndexedDB weights or skip LLM segment |
| Browser crash | Switch to backup browser with cached model |
| Display failure | Present USB screenshots of scan results |

## Sample Inventory

See `docs/demo-samples/` — all secrets are synthetic (`EXAMPLE`, `NOTREAL`, truncated keys).
