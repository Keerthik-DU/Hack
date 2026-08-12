# ADR-006: Version-Tagged IndexedDB Model Cache

- **Status:** Accepted
- **Date:** 2026-08-12

## Context
Model updates must invalidate stale cache entries.

## Decision
Store version-tagged IndexedDB entries and auto-invalidate on mismatch.

## Consequences

### Positive
- Automatic cache freshness

### Negative
- Full re-download on version bump

## Alternatives Considered
- No versioning`n- Manual cache clear only
