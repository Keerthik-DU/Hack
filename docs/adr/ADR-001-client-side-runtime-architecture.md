# ADR-001: 100% Client-Side Zero-Backend Runtime

- **Status:** Accepted
- **Date:** 2026-08-12

## Context
Zero-trust requires that pasted secrets never leave the browser.

## Decision
Ship AirGap Scanner as a static SPA with no application backend.

## Consequences

### Positive
- No server ops or data residency risk

### Negative
- No server-side verification or analytics

## Alternatives Considered
- Server-side API`n- Hybrid client-server
