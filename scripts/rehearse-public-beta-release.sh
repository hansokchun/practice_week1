#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${IKKYEE_RELEASE_BASE_URL:-https://dev.practice-week1-cws.pages.dev}"
EXPECTED_BRANCH="${IKKYEE_RELEASE_BRANCH:-dev}"
PRODUCTION_BASE_URL="${IKKYEE_PRODUCTION_BASE_URL:-https://practice-week1-cws.pages.dev}"
expect_noindex="${IKKYEE_EXPECT_NOINDEX:-auto}"

fail() {
  printf 'Release rehearsal failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 ||
    fail "required command '$1' is not installed."
}

for command_name in curl git node npm; do
  require_command "$command_name"
done

case "$BASE_URL" in
  http://* | https://*) ;;
  *) fail "IKKYEE_RELEASE_BASE_URL must be an HTTP or HTTPS origin." ;;
esac
BASE_URL="${BASE_URL%/}"
PRODUCTION_BASE_URL="${PRODUCTION_BASE_URL%/}"

case "$expect_noindex" in
  auto)
    if [[ "$BASE_URL" == "$PRODUCTION_BASE_URL" ]]; then
      expect_noindex="false"
    else
      expect_noindex="true"
    fi
    ;;
  true | false) ;;
  *) fail "IKKYEE_EXPECT_NOINDEX must be auto, true, or false." ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
  fail "run this command from the project repository."
cd "$repo_root"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$EXPECTED_BRANCH" ]] ||
  fail "expected branch '$EXPECTED_BRANCH', found '$current_branch'."
[[ -z "$(git status --porcelain)" ]] ||
  fail "the Git worktree must be clean."

printf 'Refreshing release refs...\n'
git fetch --quiet origin dev main

read -r dev_behind dev_ahead <<<"$(git rev-list --left-right --count origin/dev...HEAD)"
[[ "$dev_behind" == "0" && "$dev_ahead" == "0" ]] ||
  fail "HEAD must exactly match origin/dev."
git merge-base --is-ancestor origin/main origin/dev ||
  fail "origin/main is not an ancestor of origin/dev; inspect branch history before release."

candidate_sha="$(git rev-parse --short=12 HEAD)"
production_sha="$(git rev-parse --short=12 origin/main)"
release_distance="$(git rev-list --count origin/main..origin/dev)"

printf 'Candidate: %s\n' "$candidate_sha"
printf 'Current production Git baseline: %s\n' "$production_sha"
printf 'Candidate distance from production: %s commits\n' "$release_distance"

printf 'Running automated verification...\n'
npm test
npm run build

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ikkyee-release-rehearsal.XXXXXX")"
cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

headers_file="$temp_dir/headers.txt"
html_file="$temp_dir/index.html"
config_file="$temp_dir/config.json"
assets_file="$temp_dir/assets.txt"

printf 'Checking deployed application shell at %s...\n' "$BASE_URL"
curl --fail --silent --show-error \
  --dump-header "$headers_file" \
  --output "$html_file" \
  "$BASE_URL/"

node - "$headers_file" "$expect_noindex" <<'NODE'
const { readFileSync } = require('node:fs');
const headers = readFileSync(process.argv[2], 'utf8').toLowerCase();
for (const name of [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'x-content-type-options',
  'x-frame-options'
]) {
  if (!headers.includes(`${name}:`)) {
    throw new Error(`missing required response header: ${name}`);
  }
}
if (process.argv[3] === 'true' && !headers.includes('x-robots-tag: noindex')) {
  throw new Error('missing required Preview response header: x-robots-tag: noindex');
}
NODE

for shell_marker in 'id="page-home"' 'id="page-explore"' 'id="auth-modal"'; do
  grep -Fq "$shell_marker" "$html_file" ||
    fail "deployed HTML is missing $shell_marker."
done

node - "$html_file" "$assets_file" <<'NODE'
const { readFileSync, writeFileSync } = require('node:fs');
const html = readFileSync(process.argv[2], 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
  .map((match) => match[1]);
const uniqueAssets = [...new Set(assets)];
if (uniqueAssets.length === 0) {
  throw new Error('deployed HTML contains no /assets/ references');
}
writeFileSync(process.argv[3], `${uniqueAssets.join('\n')}\n`);
NODE

while IFS= read -r asset_path; do
  [[ -n "$asset_path" ]] || continue
  curl --fail --silent --show-error --output /dev/null "$BASE_URL$asset_path"
done <"$assets_file"

curl --fail --silent --show-error \
  --output "$config_file" \
  "$BASE_URL/api/config"

node - "$config_file" <<'NODE'
const { readFileSync } = require('node:fs');
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (typeof config.googleMapsApiKey !== 'string' || config.googleMapsApiKey.length === 0) {
  throw new Error('/api/config did not return the browser Google Maps key');
}
NODE

printf '\nRollback rehearsal only: no branch, deployment, or database was changed.\n'
printf '1. Cloudflare: choose the last known-good production deployment and use Rollback.\n'
printf '2. Smoke-check Home, /api/config, login entry, owner private photos, and logged-out Explore.\n'
printf '3. After explicit incident-owner approval, reconcile Git with:\n'
cat <<'EOF'
   git fetch origin
   git switch main
   git pull --ff-only origin main
   git revert <bad-release-sha>
   npm test
   npm run perf:budget
EOF
printf '4. Push the reviewed revert only after explicit approval; never rewrite shared history.\n'
printf '\nRelease rehearsal passed for %s at %s.\n' "$candidate_sha" "$BASE_URL"
