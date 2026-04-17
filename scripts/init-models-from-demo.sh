#!/usr/bin/env bash
# Copy models_demo/ → models_vault/ (plaintext), then encrypt each file to models_vault/*.enc.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .passphrase ]]; then
  echo "error: create a passphrase file first, e.g.:" >&2
  echo "  echo -n 'your-secret' > .passphrase && chmod 600 .passphrase" >&2
  exit 1
fi

if [[ ! -d models_demo ]]; then
  echo "error: missing models_demo/" >&2
  exit 1
fi

mkdir -p models_vault
bash "$ROOT/scripts/vault-crypto.sh" encrypt-demo -q
cp -a models_demo/. models_vault/

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  bash "$ROOT/scripts/install-git-hooks.sh"
else
  echo "note: not a git checkout — run bash scripts/install-git-hooks.sh after git init" >&2
fi

echo "OK: models_vault/ has plaintext from models_demo/ and matching *.enc"
echo "Restart the editor server if it is already running."
