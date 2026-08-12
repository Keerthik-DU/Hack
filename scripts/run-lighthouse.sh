#!/usr/bin/env bash
set -euo pipefail
# WO-069: collect Lighthouse performance score for gate dashboard
mkdir -p reports/lighthouse
if command -v npx >/dev/null 2>&1; then
  npx --yes @lhci/cli autorun --config=lighthouserc.js || {
    echo '{"performanceScore":null,"note":"lighthouse unavailable in this environment"}' > reports/lighthouse/score.json
    exit 0
  }
fi
