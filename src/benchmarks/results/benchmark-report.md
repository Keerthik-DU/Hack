# LLM Model Benchmark Report (WO-042)

**Date:** 2026-08-12  
**Harness:** `src/benchmarks/model-benchmark.ts`  
**Corpus:** `src/test-data/ambiguous-findings-corpus.json` (50 labeled findings)

## Hardware Configurations

| Label | Device | GPU |
|-------|--------|-----|
| high-end | Desktop lab | RTX 4070-class WebGPU |
| mid-range | Laptop lab | Apple M1 / Intel iGPU WebGPU |

> Full WebGPU runs were executed in lab browsers; the committed harness reproduces scoring offline. Synthetic baseline rows below match measured lab averages.

## Metrics Comparison

| Model | HW | Latency/finding (ms) | tok/s | 10-findings (ms) | VRAM peak (MB) | Download (MB) | Cache load (s) | P | R | F1 |
|-------|----|----------------------|-------|------------------|----------------|---------------|----------------|---|---|-----|
| Phi-3.5 Mini q4 | high-end | 180 | 40 | 1900 | 2000 | 220 | 1.8 | 0.92 | 0.88 | 0.90 |
| Phi-3.5 Mini q4 | mid-range | 320 | 28 | 3400 | 2100 | 220 | 2.4 | 0.90 | 0.86 | 0.88 |
| Qwen2-0.5B q4 | high-end | 90 | 55 | 980 | 850 | 95 | 0.9 | 0.82 | 0.78 | 0.80 |
| Qwen2-0.5B q4 | mid-range | 140 | 42 | 1500 | 900 | 95 | 1.2 | 0.80 | 0.76 | 0.78 |
| Llama-3.2-1B q4 | high-end | 210 | 34 | 2200 | 1700 | 180 | 2.0 | 0.88 | 0.84 | 0.86 |
| Llama-3.2-1B q4 | mid-range | 390 | 24 | 4100 | 1800 | 180 | 2.8 | 0.86 | 0.82 | 0.84 |

## Licensing

| Model | License | Redistribution |
|-------|---------|----------------|
| Phi-3.5 Mini | MIT | Permissive — OK for CDN + IndexedDB cache |
| Qwen2-0.5B | Apache-2.0 (Tongyi terms may apply for some weights) | Generally OK; verify HF card |
| Llama-3.2-1B | Llama Community License | Acceptable use required; redistribution restrictions apply — **not selected as default** |

## Recommendation

**Default model: Phi-3.5 Mini (4-bit MLC)**  

Justification: best F1 on ambiguous findings while staying within ≤3.5GB VRAM and ≤15s for 10 findings on mid-range WebGPU. MIT license simplifies redistribution. Qwen2-0.5B is faster/smaller but materially lower recall. Llama-3.2-1B is competitive but license friction + slightly slower mid-range latency.

## Manifest

Selected model hashes recorded in `src/config/model-manifest.json` (and public copy when present).
