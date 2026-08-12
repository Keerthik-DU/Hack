#!/usr/bin/env bash
# scripts/verify-manifest.sh
# Verifies that model-manifest.json exists in the dist/ output directory.
#
# Usage:
#   bash scripts/verify-manifest.sh
#
# Environment variables:
#   SKIP_MANIFEST_CHECK=true  — bypass the manifest check during early
#                               development phases before LLM integration is
#                               complete. Set in forge-pipeline.yml or locally.
#
# Exit codes:
#   0 — manifest found (or check skipped via SKIP_MANIFEST_CHECK)
#   1 — manifest missing from dist/

set -euo pipefail

MANIFEST_PATH="dist/model-manifest.json"

if [ "${SKIP_MANIFEST_CHECK:-false}" = "true" ]; then
  echo "INFO: SKIP_MANIFEST_CHECK=true — skipping model-manifest.json verification."
  echo "      Set SKIP_MANIFEST_CHECK=false (or unset it) once LLM integration is complete."
  exit 0
fi

if [ -f "${MANIFEST_PATH}" ]; then
  echo "OK: model-manifest.json found at ${MANIFEST_PATH}"
  exit 0
else
  echo "ERROR: model-manifest.json is missing from ${MANIFEST_PATH}" >&2
  echo "" >&2
  echo "  This file must be present in the dist/ output directory for the" >&2
  echo "  build to pass. To fix this, either:" >&2
  echo "" >&2
  echo "  1. Ensure model-manifest.json exists at the repository root and" >&2
  echo "     is configured to be copied to dist/ by the Vite build" >&2
  echo "     (check vite.config.ts publicDir or the public/ directory)." >&2
  echo "" >&2
  echo "  2. Set SKIP_MANIFEST_CHECK=true in your pipeline environment" >&2
  echo "     to bypass this check during early development (before LLM" >&2
  echo "     integration is complete)." >&2
  exit 1
fi
