# ADR-005: SRI-Style SHA-256 Model Integrity Verification

- **Status:** Accepted
- **Date:** 2026-08-12

## Context
Downloaded model weights are a supply-chain risk.

## Decision
Verify SHA-256 hashes against pinned model-manifest.json before use.

## Consequences

### Positive
- Tamper detection without a server

### Negative
- Manifest updates required per model version

## Alternatives Considered
- No verification`n- Server-side verification`n- Certificate pinning
