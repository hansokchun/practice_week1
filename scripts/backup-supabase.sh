#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

PROJECT_REF="${SUPABASE_PROJECT_REF:-pqczcponriukilrtpbdl}"
CLI_VERSION="2.109.1"
BACKUP_DIR="${IKKYEE_BACKUP_DIR:-$HOME/Backups/ikkyee}"
MODE="${1:-backup}"

usage() {
  cat <<'EOF'
Usage:
  npm run backup:check
  npm run backup:db

Environment:
  SUPABASE_DB_URL            Optional non-interactive database connection string.
  IKKYEE_BACKUP_DIR          Destination outside this repository.
  IKKYEE_BACKUP_PASSPHRASE   Optional non-interactive encryption passphrase.
  SUPABASE_PROJECT_REF       Override the recorded project reference.
EOF
}

fail() {
  printf 'Backup check failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command '$1' is not installed."
}

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$MODE" != "backup" && "$MODE" != "--check" ]]; then
  usage >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
  fail "run this command from the project repository."

mkdir -p "$BACKUP_DIR"
backup_dir_abs="$(cd "$BACKUP_DIR" && pwd -P)"
repo_root_abs="$(cd "$repo_root" && pwd -P)"

case "$backup_dir_abs/" in
  "$repo_root_abs/"*)
    fail "backup destination must be outside the Git repository."
    ;;
esac

require_command node
require_command npm
require_command openssl
require_command tar
require_command shasum
require_command docker

docker info >/dev/null 2>&1 ||
  fail "Docker is installed but its daemon is not running."

cli_version="$(npx -y "supabase@$CLI_VERSION" --version)"
[[ "$cli_version" == "$CLI_VERSION" ]] ||
  fail "expected Supabase CLI $CLI_VERSION, received $cli_version."

if [[ "$MODE" == "--check" ]]; then
  printf 'Backup prerequisites are ready.\n'
  printf 'Supabase CLI: %s\n' "$cli_version"
  printf 'Encrypted backup destination: %s\n' "$backup_dir_abs"
  exit 0
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  [[ -t 0 ]] || fail "SUPABASE_DB_URL is required in a non-interactive shell."

  read -r -s -p "Supabase DB URL: " database_url
  printf '\n'
  export SUPABASE_DB_URL="$database_url"
  unset database_url
fi

case "$SUPABASE_DB_URL" in
  postgres://* | postgresql://*) ;;
  *) fail "use the encoded Postgres connection string from Supabase Connect." ;;
esac

if [[ -z "${IKKYEE_BACKUP_PASSPHRASE:-}" ]]; then
  [[ -t 0 ]] || fail "IKKYEE_BACKUP_PASSPHRASE is required in a non-interactive shell."

  read -r -s -p "Backup encryption passphrase: " passphrase
  printf '\n'
  read -r -s -p "Confirm passphrase: " passphrase_confirmation
  printf '\n'

  [[ "$passphrase" == "$passphrase_confirmation" ]] ||
    fail "passphrases do not match."
  [[ "${#passphrase}" -ge 16 ]] ||
    fail "use an encryption passphrase of at least 16 characters."

  export IKKYEE_BACKUP_PASSPHRASE="$passphrase"
  unset passphrase passphrase_confirmation
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="ikkyee-supabase-${timestamp}.tar.gz"
encrypted_archive="$backup_dir_abs/${archive_name}.enc"
checksum_file="${encrypted_archive}.sha256"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ikkyee-backup.XXXXXX")"

cleanup() {
  rm -rf "$temp_dir"
  unset IKKYEE_BACKUP_PASSPHRASE SUPABASE_DB_URL
}
trap cleanup EXIT

cli=(npx -y "supabase@$CLI_VERSION")

printf 'Exporting Supabase roles...\n'
"${cli[@]}" db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "$temp_dir/roles.sql" \
  --role-only

printf 'Exporting Supabase schema...\n'
"${cli[@]}" db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "$temp_dir/schema.sql"

printf 'Exporting Supabase data...\n'
"${cli[@]}" db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "$temp_dir/data.sql" \
  --use-copy \
  --data-only

for dump_file in roles.sql schema.sql data.sql; do
  [[ -s "$temp_dir/$dump_file" ]] ||
    fail "$dump_file was not created or is empty."
done

{
  printf 'project_ref=%s\n' "$PROJECT_REF"
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'supabase_cli_version=%s\n' "$CLI_VERSION"
  printf 'roles_sha256=%s\n' "$(shasum -a 256 "$temp_dir/roles.sql" | awk '{print $1}')"
  printf 'schema_sha256=%s\n' "$(shasum -a 256 "$temp_dir/schema.sql" | awk '{print $1}')"
  printf 'data_sha256=%s\n' "$(shasum -a 256 "$temp_dir/data.sql" | awk '{print $1}')"
} >"$temp_dir/manifest.txt"

tar -C "$temp_dir" -czf "$temp_dir/$archive_name" \
  roles.sql schema.sql data.sql manifest.txt

openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass env:IKKYEE_BACKUP_PASSPHRASE \
  -in "$temp_dir/$archive_name" \
  -out "$encrypted_archive"
chmod 600 "$encrypted_archive"

openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:IKKYEE_BACKUP_PASSPHRASE \
  -in "$encrypted_archive" \
  -out "$temp_dir/verified-$archive_name"
tar -tzf "$temp_dir/verified-$archive_name" >/dev/null

(
  cd "$backup_dir_abs"
  shasum -a 256 "$(basename "$encrypted_archive")" >"$(basename "$checksum_file")"
)
chmod 600 "$checksum_file"

printf 'Encrypted backup verified: %s\n' "$encrypted_archive"
printf 'SHA-256 record: %s\n' "$checksum_file"
