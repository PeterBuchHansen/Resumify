#!/usr/bin/env bash
# models_demo (plaintext, in git) <-> models_vault/*.enc (OpenSSL AES-256-CBC + PBKDF2).
# Passphrase: repo-root .passphrase (or PASSFILE= override).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="$ROOT/models_vault"
DEMO="$ROOT/models_demo"
QUIET=0
OPENSSL_CIPHER="-aes-256-cbc"
OPENSSL_KDF=(-pbkdf2 -iter 600000)

if [[ -z "${PASSFILE:-}" ]]; then
  PASSFILE="$ROOT/.passphrase"
fi

log() { [[ "$QUIET" -eq 0 ]] && echo "$@" || true; }

usage() {
  echo "Usage: $0 encrypt-demo|decrypt-to DIR|encrypt-from DIR|encrypt-one NAME|decrypt-one NAME [-q]" >&2
  echo "  encrypt-demo   models_demo/* -> models_vault/*.enc (removes vault blobs with no plaintext source)" >&2
  echo "  decrypt-to DIR models_vault/*.enc -> DIR/<name> (DIR must exist or be creatable)" >&2
  echo "  encrypt-from DIR DIR/* -> models_vault/*.enc (orphan .enc removed)" >&2
  echo "  encrypt-one NAME  models_vault/NAME -> models_vault/NAME.enc" >&2
  echo "  decrypt-one NAME  stdout <- models_vault/NAME.enc" >&2
  exit 1
}

cmd="${1:-}"
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    -q) QUIET=1; shift ;;
    *) break ;;
  esac
done

[[ -n "$cmd" ]] || usage

if ! command -v openssl >/dev/null 2>&1; then
  echo "error: openssl not found" >&2
  exit 1
fi

if [[ "$cmd" != "decrypt-one" && "$cmd" != "encrypt-one" && "$cmd" != encrypt-demo && "$cmd" != decrypt-to && "$cmd" != encrypt-from ]]; then
  usage
fi

if [[ ! -f "$PASSFILE" ]]; then
  echo "error: missing passphrase file (expected $PASSFILE)" >&2
  echo "  echo -n 'your-secret' > .passphrase && chmod 600 .passphrase" >&2
  exit 1
fi

encrypt_from_dir() {
  local SRC="$1"
  mkdir -p "$VAULT"
  declare -A present=()
  shopt -s nullglob
  local f b
  for f in "$SRC"/*; do
    [[ -f "$f" ]] || continue
    b="$(basename "$f")"
    [[ "$b" == *.enc ]] && continue
    present["$b"]=1
    log "encrypt: $b"
    openssl enc -e "$OPENSSL_CIPHER" -salt "${OPENSSL_KDF[@]}" -pass "file:$PASSFILE" -in "$f" -out "$VAULT/$b.enc"
  done
  local enc
  for enc in "$VAULT"/*.enc; do
    [[ -f "$enc" ]] || continue
    b="$(basename "$enc" .enc)"
    if [[ -z "${present[$b]+x}" ]]; then
      log "remove orphan: $(basename "$enc")"
      rm -f "$enc"
    fi
  done
}

case "$cmd" in
  encrypt-demo)
    if [[ ! -d "$DEMO" ]]; then
      echo "error: missing $DEMO" >&2
      exit 1
    fi
    encrypt_from_dir "$DEMO"
    log "encrypt-demo done."
    ;;
  decrypt-to)
    DEST="${1:-}"
    [[ -n "$DEST" ]] || usage
    mkdir -p "$DEST"
    shopt -s nullglob
    encs=("$VAULT"/*.enc)
    if (( ${#encs[@]} == 0 )); then
      log "no files in models_vault/*.enc"
      exit 1
    fi
    for enc in "${encs[@]}"; do
      b="$(basename "$enc" .enc)"
      log "decrypt: $b"
      openssl enc -d "$OPENSSL_CIPHER" "${OPENSSL_KDF[@]}" -pass "file:$PASSFILE" -in "$enc" -out "$DEST/$b"
    done
    log "decrypt-to done."
    ;;
  encrypt-from)
    SRC="${1:-}"
    [[ -n "$SRC" ]] || usage
    [[ -d "$SRC" ]] || { echo "error: not a directory: $SRC" >&2; exit 1; }
    encrypt_from_dir "$SRC"
    log "encrypt-from done."
    ;;
  encrypt-one)
    NAME="${1:-}"
    [[ -n "$NAME" ]] || usage
    if [[ "$NAME" == *"/"* || "$NAME" == *".."* ]]; then
      echo "error: invalid name" >&2
      exit 1
    fi
    plain="$VAULT/$NAME"
    if [[ ! -f "$plain" ]]; then
      echo "error: missing plaintext $plain" >&2
      exit 1
    fi
    log "encrypt: $NAME"
    openssl enc -e "$OPENSSL_CIPHER" -salt "${OPENSSL_KDF[@]}" -pass "file:$PASSFILE" -in "$plain" -out "$VAULT/$NAME.enc"
    ;;
  decrypt-one)
    NAME="${1:-}"
    [[ -n "$NAME" ]] || usage
    if [[ "$NAME" == *"/"* || "$NAME" == *".."* ]]; then
      echo "error: invalid name" >&2
      exit 1
    fi
    enc="$VAULT/$NAME.enc"
    if [[ ! -f "$enc" ]]; then
      echo "error: missing $enc" >&2
      exit 1
    fi
    exec openssl enc -d "$OPENSSL_CIPHER" "${OPENSSL_KDF[@]}" -pass "file:$PASSFILE" -in "$enc"
    ;;
esac
