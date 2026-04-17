#!/usr/bin/env bash
# Decrypt every models_vault/*.enc into plaintext files in models_vault/ (same names, no .enc).
# Typical after git clone: only *.enc is in the repo; add .passphrase at repo root, then run this.
# Passphrase: repo-root .passphrase unless PASSFILE is set (see scripts/vault-crypto.sh). Does not remove .enc files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASSFILE="${PASSFILE:-$ROOT/.passphrase}"
if [[ ! -f "$PASSFILE" ]]; then
  echo "error: missing passphrase file (expected $PASSFILE)" >&2
  echo "  echo -n 'your-secret' > .passphrase && chmod 600 .passphrase" >&2
  exit 1
fi

shopt -s nullglob
enc=(models_vault/*.enc)
if [[ ${#enc[@]} -eq 0 ]]; then
  echo "error: no models_vault/*.enc files — nothing to decrypt" >&2
  exit 1
fi

bash "$ROOT/scripts/vault-crypto.sh" decrypt-to "$ROOT/models_vault" "$@"
echo "OK: plaintext restored under models_vault/. Restart the editor server if it was already running."
