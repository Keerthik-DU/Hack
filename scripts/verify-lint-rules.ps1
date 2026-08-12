# verify-lint-rules.ps1 — WO-051 (Windows)
# Thin wrapper around the cross-platform Node verifier.
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RootDir
$env:ESLINT_USE_FLAT_CONFIG = "true"
node scripts/verify-lint-rules.mjs
exit $LASTEXITCODE
