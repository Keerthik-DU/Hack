#!/usr/bin/env bash
# WO-070: re-deploy a prior artifact version tag (target <= 5 minutes).
set -euo pipefail
VERSION_TAG="${1:-}"
ENV_NAME="${2:-production}"
if [[ -z "$VERSION_TAG" ]]; then
  echo "Usage: bash scripts/rollback.sh <version_tag> [production|staging]" >&2
  exit 1
fi
echo "Rolling back $ENV_NAME to artifact version $VERSION_TAG"
echo "1) Retrieve immutable artifact from registry by tag"
echo "2) Redeploy via deploy:static"
echo "3) Invalidate CDN cache for edge nodes"
echo "4) Run production smoke: npx playwright test tests/e2e/production --project=chromium"
echo "Rollback orchestration is completed by Forge shipping_trigger_rollback."
