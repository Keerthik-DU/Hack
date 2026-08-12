# ADR-003: LLM Inference in Dedicated Web Worker

- **Status:** Accepted
- **Date:** 2026-08-12

## Context
GPU-bound inference must not block UI.

## Decision
Run LLM inference in a dedicated module Worker with typed messages.

## Consequences

### Positive
- UI remains responsive

### Negative
- postMessage serialization overhead

## Alternatives Considered
- Main thread`n- SharedWorker`n- Service Worker
