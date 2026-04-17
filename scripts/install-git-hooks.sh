#!/usr/bin/env bash
# Point this repo at .githooks/ (versioned hooks) instead of .git/hooks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
git config core.hooksPath .githooks
echo "Set core.hooksPath to .githooks (pre-commit refreshes models_vault/*.enc when .passphrase exists)."
