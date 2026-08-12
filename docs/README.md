# AirGap Scanner Documentation

This directory holds project documentation for AirGap Scanner — the local, in-browser secret scanner that keeps pasted content on the user's machine.

Documentation is organized as standalone Markdown artifacts under `docs/`. Each file is the source of truth for its topic (compliance, user guidance, architecture decisions, and related materials). Link new documents from this index when they are added.

## Table of Contents

| Document | Description |
| --- | --- |
| [Data Classification Policy](./data-classification.md) | Authoritative inventory of data entities, classification tiers, retention, access controls, and enforcement mechanisms (GDPR/CCPA posture). |
| [User Guide](./user-guide.md) | End-user paste-and-scan workflow, results interpretation, privacy guarantees, and troubleshooting for developers, DevOps, and security practitioners. |
| Architecture Decision Records *(planned)* | Significant technical decisions and trade-offs. |
| Demo / Operations Notes *(planned)* | Demo scripts and operational runbooks that reference data-handling guarantees. |

## Conventions

- Prefer one topic per Markdown file at the `docs/` root (or a clearly named subdirectory for multi-file sets).
- Use the product name **AirGap Scanner** consistently.
- Do not include real secrets or credentials; use synthetic examples only.
- Keep compliance and security claims aligned with the architecture's zero-trust, client-side isolation model.
