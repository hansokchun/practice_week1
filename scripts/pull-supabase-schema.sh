#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

CLI_VERSION="2.109.1"

fail() {
  printf 'Schema pull failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 ||
    fail "required command '$1' is not installed."
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
  fail "run this command from the project repository."
schema_file="${SUPABASE_SCHEMA_FILE:-$repo_root/supabase/schema.sql}"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ikkyee-schema.XXXXXX")"
raw_schema="$temp_dir/schema.sql"
staged_schema="$temp_dir/schema-with-header.sql"

cleanup() {
  rm -rf "$temp_dir"
  unset SUPABASE_DB_URL
}
trap cleanup EXIT

require_command docker
require_command node
require_command npm

docker info >/dev/null 2>&1 ||
  fail "Docker is installed but its daemon is not running."

cli_version="$(npx -y "supabase@$CLI_VERSION" --version)"
[[ "$cli_version" == "$CLI_VERSION" ]] ||
  fail "expected Supabase CLI $CLI_VERSION, received $cli_version."

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

printf 'Exporting live Supabase schema...\n'
npx -y "supabase@$CLI_VERSION" db dump \
  --db-url "$SUPABASE_DB_URL" \
  --file "$raw_schema"

[[ -s "$raw_schema" ]] || fail "the schema dump is empty."

if grep -Eqi \
  'postgres(ql)?://|SUPABASE_DB_URL|service_role[[:space:]]*[:=]|sb_secret_|eyJ[A-Za-z0-9_-]{20,}' \
  "$raw_schema"; then
  fail "the generated schema contains a possible connection string or secret."
fi

{
  printf '%s\n' '-- Ikkyee live Supabase schema baseline.'
  printf '%s\n' "-- Generated with Supabase CLI $CLI_VERSION; contains no table data."
  printf '\n'
  sed '/^\\restrict /d; /^\\unrestrict /d; s/[[:space:]]*$//' "$raw_schema" |
    awk '
      { lines[NR] = $0 }
      END {
        last = NR
        while (last > 0 && lines[last] == "") last--
        for (line = 1; line <= last; line++) print lines[line]
      }
    '
} >"$staged_schema"

mkdir -p "$(dirname "$schema_file")"
mv "$staged_schema" "$schema_file"
chmod 644 "$schema_file"

printf 'Schema baseline written: %s\n' "$schema_file"
