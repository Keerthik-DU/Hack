# LLM Model & Dependency License Compliance (WO-072)

## Executive Summary

AirGap Scanner may redistribute client-side model artifacts and runtime libraries.
This audit evaluates licenses for commercial use and redistribution. **Recommended default model: Phi-3.5 Mini (MIT).**

## Methodology

Reviewed SPDX identifiers and upstream LICENSE/model-card text for each dependency as of the AirGap Scanner MVP stack. Verdicts: Approved / Conditional / Rejected.

## Dependency Audit Table

| Dependency | Version / range | License | Redistribution | Attribution | Verdict |
|---|---|---|---|---|---|
| `@mlc-ai/web-llm` | ^0.2.x | Apache-2.0 | Yes | NOTICE + Apache notice | Approved |
| Apache TVM / MLC-LLM | upstream runtime | Apache-2.0 | Yes | NOTICE | Approved |
| Phi-3.5 Mini (MLC) | selected default | MIT | Yes | Copyright notice | Approved |
| Qwen2-0.5B | candidate | Apache-2.0 (Qwen) | Yes with notice | NOTICE | Approved |
| Llama-3.2-1B | candidate | Meta Llama Community License | Conditional | Meta terms | Conditional |
| Gitleaks (patterns inspiration) | n/a (source inspiration) | MIT | Yes | Copyright | Approved |
| Secrets Patterns DB | curated rules | Mixed / MIT-like upstream | Verify per rule file | Upstream credits | Conditional |

## Detailed Findings

### @mlc-ai/web-llm — Approved
Apache-2.0 permits commercial use and redistribution of the library with attribution and NOTICE retention.

### Apache TVM / MLC-LLM — Approved
Apache-2.0 compiled runtimes and tooling; retain NOTICE for binary redistributions.

### Phi-3.5 Mini — Approved (recommended default)
Microsoft MIT terms for the model family used via MLC-compiled artifacts allow redistribution and commercial use with copyright notice retention. Aligns with ADR default selection from WO-042.

### Qwen2-0.5B — Approved
Alibaba Qwen2 licenses typically Apache-2.0 for the open weights used here; treat MLC-compiled artifacts as inheriting the same terms and keep attribution.

### Llama-3.2-1B — Conditional
Meta Llama Community License allows use and redistribution subject to Acceptable Use and the monthly active user threshold (commonly 700M MAU). Suitable as an **optional** alternate model with explicit user-facing license disclosure; **not** recommended as the default bundled model for the hackathon MVP.

### Gitleaks — Approved
MIT; pattern inspiration only — no binary redistribution of Gitleaks itself required.

### Secrets Patterns DB — Conditional
Confirm each imported rule set’s upstream license before expanding the registry beyond MIT/Apache sources.

## Recommendation

**Default model: Phi-3.5 Mini (MIT)** — clearest redistribution rights, matches WO-042 benchmark recommendation, and minimizes Meta Community License compliance overhead. Keep Qwen2 as an optional Approved alternate. Ship Llama-3.2 only behind an explicit optional download with license acceptance if needed later.

## Next Steps

1. Keep `NOTICE` and `LICENSE` at repo root current when dependencies change.
2. Re-audit before any commercial redistribution of Llama-class weights.
3. Link this document from project docs README.
