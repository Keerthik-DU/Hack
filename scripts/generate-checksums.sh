#!/usr/bin/env bash
# scripts/generate-checksums.sh
# Generates a SHA-256 checksums manifest for every file under dist/.
#
# Usage:
#   bash scripts/generate-checksums.sh
#
# Outputs:
#   checksums.sha256 - one line per file: "<hash>  <relative-path>"
#   Written to the repository root (not inside dist/) so the manifest can be
#   recorded in pipeline metadata without mutating the artifact bundle.
#
# Exit codes:
#   0 - checksums.sha256 written successfully
#   1 - validation or hashing failure (empty dist/, missing files, hash errors)

set -euo pipefail

DIST_DIR="dist"
OUTPUT_FILE="checksums.sha256"

if [ ! -d "${DIST_DIR}" ]; then
  echo "ERROR: ${DIST_DIR}/ directory does not exist." >&2
  echo "  The Build stage must produce artifacts before checksum generation." >&2
  echo "  Re-run the pipeline from the Build stage, or verify the Vite build" >&2
  echo "  wrote output to ${DIST_DIR}/." >&2
  exit 1
fi

file_count="$(find "${DIST_DIR}" -type f | wc -l | tr -d '[:space:]')"
if [ "${file_count}" -eq 0 ]; then
  echo "ERROR: ${DIST_DIR}/ is empty - refusing to generate an empty checksums manifest." >&2
  echo "  Pushing an empty artifact bundle would break supply-chain integrity." >&2
  echo "  Ensure the Build stage produced output files under ${DIST_DIR}/." >&2
  exit 1
fi

# Prefer sha256sum (GNU coreutils); fall back to shasum on macOS runners.
if command -v sha256sum >/dev/null 2>&1; then
  hash_file() { sha256sum "$1"; }
elif command -v shasum >/dev/null 2>&1; then
  hash_file() { shasum -a 256 "$1"; }
else
  echo "ERROR: Neither sha256sum nor shasum is available on this runner." >&2
  echo "  Install GNU coreutils (sha256sum) or ensure shasum is on PATH." >&2
  exit 1
fi

: > "${OUTPUT_FILE}"

hashed=0
# Sorted iteration keeps the manifest deterministic across runners.
while IFS= read -r file; do
  if [ ! -f "${file}" ]; then
    echo "ERROR: Could not hash '${file}' - file is missing or not a regular file." >&2
    exit 1
  fi

  if ! raw="$(hash_file "${file}")"; then
    echo "ERROR: Failed to compute SHA-256 for '${file}'." >&2
    echo "  Check file permissions and that the file is readable." >&2
    exit 1
  fi

  # Normalize to the required manifest format: "<sha256>  <filepath>"
  # (GNU text mode uses two spaces; some runners emit binary-mode " *".)
  hash="${raw%% *}"
  if [ "${#hash}" -ne 64 ]; then
    echo "ERROR: Unexpected SHA-256 output for '${file}': ${raw}" >&2
    exit 1
  fi
  echo "${hash}  ${file}" >> "${OUTPUT_FILE}"
  hashed=$((hashed + 1))
done < <(find "${DIST_DIR}" -type f | LC_ALL=C sort)

if [ "${hashed}" -eq 0 ]; then
  echo "ERROR: No files were hashed under ${DIST_DIR}/." >&2
  exit 1
fi

echo "OK: Wrote ${hashed} SHA-256 checksum(s) to ${OUTPUT_FILE}"
echo "--- checksums.sha256 ---"
cat "${OUTPUT_FILE}"
echo "------------------------"
