# ADR-002: @mlc-ai/web-llm via WebGPU

- **Status:** Accepted
- **Date:** 2026-08-12

## Context
Need in-browser LLM for contextual secret analysis.

## Decision
Use @mlc-ai/web-llm with WebGPU-accelerated quantized models.

## Consequences

### Positive
- OpenAI-compatible API; IndexedDB caching

### Negative
- Requires WebGPU-capable browsers

## Alternatives Considered
- Transformers.js + ONNX Runtime Web`n- Chrome Built-in AI API
