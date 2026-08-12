#!/usr/bin/env bash
# verify-lint-rules.sh — WO-051
# Thin wrapper around the cross-platform Node verifier.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
export ESLINT_USE_FLAT_CONFIG=true
exec node scripts/verify-lint-rules.mjs
