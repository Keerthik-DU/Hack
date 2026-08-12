#!/usr/bin/env bash
# WO-070: placeholder static deploy helper for Forge shipping stages.
# Real hosting credentials are injected by the Forge environment.
set -euo pipefail

ENV_NAME="${1:-staging}"
echo "Deploying dist/ to environment: ${ENV_NAME}"
if [[ ! -d dist ]]; then
  echo "ERROR: dist/ missing — run vite build first" >&2
  exit 1
fi
if [[ ! -f dist/model-manifest.json ]]; then
  echo "ERROR: dist/model-manifest.json missing" >&2
  exit 1
fi
echo "Static deploy gate checks passed for ${ENV_NAME}."
echo "Upload of dist/ is performed by the Forge deploy:static step."
