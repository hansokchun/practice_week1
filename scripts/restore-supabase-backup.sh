#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

CLI_VERSION="2.109.1"
BACKUP_DIR="${IKKYEE_BACKUP_DIR:-$HOME/Backups/ikkyee}"
MODE="${1:-restore}"

fail() {
  printf 'Restore rehearsal failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 ||
    fail "required command '$1' is not installed."
}

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  cat <<'EOF'
Usage:
  npm run restore:check
  npm run restore:db

Environment:
  IKKYEE_BACKUP_DIR          Directory containing encrypted backups.
  IKKYEE_RESTORE_ARCHIVE     Optional encrypted archive path.
  IKKYEE_BACKUP_PASSPHRASE  Optional non-interactive encryption passphrase.
EOF
  exit 0
fi

if [[ "$MODE" != "restore" && "$MODE" != "--check" ]]; then
  fail "use --check or run without arguments."
fi

require_command docker
require_command node
require_command npm
require_command openssl
require_command shasum
require_command tar

docker info >/dev/null 2>&1 ||
  fail "Docker is installed but its daemon is not running."

cli_version="$(npx -y "supabase@$CLI_VERSION" --version)"
[[ "$cli_version" == "$CLI_VERSION" ]] ||
  fail "expected Supabase CLI $CLI_VERSION, received $cli_version."

if [[ -n "${IKKYEE_RESTORE_ARCHIVE:-}" ]]; then
  encrypted_archive="$IKKYEE_RESTORE_ARCHIVE"
else
  encrypted_archive="$(
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'ikkyee-supabase-*.tar.gz.enc' \
      -print 2>/dev/null |
      sort |
      tail -n 1
  )"
fi

[[ -n "$encrypted_archive" && -f "$encrypted_archive" ]] ||
  fail "no encrypted backup archive was found."

archive_dir="$(cd "$(dirname "$encrypted_archive")" && pwd -P)"
encrypted_archive="$archive_dir/$(basename "$encrypted_archive")"
checksum_file="${encrypted_archive}.sha256"
[[ -f "$checksum_file" ]] ||
  fail "the SHA-256 checksum file is missing."

(
  cd "$archive_dir"
  shasum -a 256 -c "$(basename "$checksum_file")"
) >/dev/null || fail "the encrypted archive checksum does not match."

if [[ "$MODE" == "--check" ]]; then
  printf 'Restore prerequisites are ready.\n'
  printf 'Supabase CLI: %s\n' "$cli_version"
  printf 'Verified encrypted archive: %s\n' "$encrypted_archive"
  exit 0
fi

if [[ -z "${IKKYEE_BACKUP_PASSPHRASE:-}" ]]; then
  [[ -t 0 ]] ||
    fail "IKKYEE_BACKUP_PASSPHRASE is required in a non-interactive shell."

  read -r -s -p "Backup encryption passphrase: " passphrase
  printf '\n'
  export IKKYEE_BACKUP_PASSPHRASE="$passphrase"
  unset passphrase
fi

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ikkyee-restore.XXXXXX")"
restore_dir="$temp_dir/restore"
local_dir="$temp_dir/local"
local_project_id="ikkyee_restore_$$_${RANDOM}"
local_started=0

cleanup() {
  unset IKKYEE_BACKUP_PASSPHRASE
  if [[ "$local_started" -eq 1 ]]; then
    npx -y "supabase@$CLI_VERSION" stop \
      --workdir "$local_dir" \
      --no-backup >/dev/null 2>&1 || true
  fi
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$restore_dir" "$local_dir"
decrypted_archive="$temp_dir/backup.tar.gz"

openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:IKKYEE_BACKUP_PASSPHRASE \
  -in "$encrypted_archive" \
  -out "$decrypted_archive" ||
  fail "the archive could not be decrypted."
unset IKKYEE_BACKUP_PASSPHRASE

tar -xzf "$decrypted_archive" -C "$restore_dir"
rm -f "$decrypted_archive"

for file in roles.sql schema.sql data.sql manifest.txt; do
  [[ -s "$restore_dir/$file" ]] ||
    fail "$file is missing or empty in the archive."
done

for file in roles.sql schema.sql data.sql; do
  expected_hash="$(
    awk -F= -v key="${file%.sql}_sha256" '$1 == key { print $2 }' \
      "$restore_dir/manifest.txt"
  )"
  actual_hash="$(shasum -a 256 "$restore_dir/$file" | awk '{print $1}')"
  [[ -n "$expected_hash" && "$actual_hash" == "$expected_hash" ]] ||
    fail "$file does not match the archive manifest."
done

npx -y "supabase@$CLI_VERSION" init --workdir "$local_dir" >/dev/null
config_file="$local_dir/supabase/config.toml"
db_port="$((55000 + ($$ % 5000)))"
sed -i.bak \
  -e "s/project_id = \".*\"/project_id = \"$local_project_id\"/" \
  -e "0,/port = 54322/s//port = $db_port/" \
  "$config_file"
rm -f "${config_file}.bak"

local_started=1
npx -y "supabase@$CLI_VERSION" db start \
  --workdir "$local_dir" \
  --yes >/dev/null

container_name="supabase_db_${local_project_id}"
docker exec "$container_name" mkdir -p /tmp/ikkyee-restore
for file in roles.sql schema.sql data.sql; do
  docker cp "$restore_dir/$file" \
    "$container_name:/tmp/ikkyee-restore/$file" >/dev/null
done

docker exec "$container_name" psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --username postgres \
  --dbname postgres \
  --file /tmp/ikkyee-restore/roles.sql \
  --file /tmp/ikkyee-restore/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file /tmp/ikkyee-restore/data.sql \
  >"$temp_dir/restore.log" ||
  fail "psql could not restore the backup."

schema_metrics="$(
  docker exec "$container_name" psql \
    --username postgres \
    --dbname postgres \
    --tuples-only \
    --no-align \
    --field-separator '|' \
    --command "
      select
        (select count(*) from pg_tables where schemaname = 'public'),
        (select count(*) from pg_policies where schemaname = 'public'),
        (
          select count(*)
          from pg_trigger t
          join pg_class c on c.oid = t.tgrelid
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and not t.tgisinternal
        ),
        (
          select count(distinct c.oid)
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relkind = 'r'
            and c.relrowsecurity
        );
    "
)"
[[ "$schema_metrics" == "7|24|1|7" ]] ||
  fail "restored schema metrics were unexpected: $schema_metrics."

data_metrics="$(
  docker exec "$container_name" psql \
    --username postgres \
    --dbname postgres \
    --tuples-only \
    --no-align \
    --field-separator '|' \
    --command "
      select
        (select count(*) from public.photos),
        (select count(*) from public.albums),
        (select count(*) from public.profiles),
        (select count(*) from public.user_likes),
        (select count(*) from public.photo_private_locations);
    "
)"

printf 'Restore rehearsal passed in an isolated local Supabase database.\n'
printf 'Schema metrics (tables|policies|triggers|RLS tables): %s\n' \
  "$schema_metrics"
printf 'Safe row counts (photos|albums|profiles|likes|private locations): %s\n' \
  "$data_metrics"
printf 'Plaintext files and the disposable database will now be removed.\n'
