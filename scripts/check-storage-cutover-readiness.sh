#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-full}"

usage() {
  cat <<'EOF'
Usage:
  npm run storage:preflight:check
  npm run storage:preflight

The check command validates local prerequisites and the latest aggregate
Supabase cutover snapshot. The full command also requires a clean dev branch,
confirms it matches origin/dev, and runs the release rehearsal.

Neither command changes Git branches, Supabase data, or Storage configuration.
EOF
}

fail() {
  printf 'Storage cutover preflight failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 ||
    fail "required command '$1' is not installed."
}

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$MODE" != "full" && "$MODE" != "--check" ]]; then
  usage >&2
  exit 2
fi

for command_name in git node npm curl; do
  require_command "$command_name"
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
  fail "run this command from the project repository."
cd "$repo_root"

snapshot_file="docs/qa/storage-cutover-readiness-2026-07-27.json"
[[ -f "$snapshot_file" ]] ||
  fail "the aggregate Supabase readiness snapshot is missing."

grep -Fq "createSignedUrls(paths, 900)" auth.js ||
  fail "batch signed URL hydration is missing from auth.js."
grep -Fq "storage_path" auth.js ||
  fail "storage_path compatibility is missing from auth.js."

node - "$snapshot_file" <<'NODE'
const { readFileSync } = require('node:fs');

const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const expectedProject = 'pqczcponriukilrtpbdl';
const allowedWarnings = new Set(['auth_leaked_password_protection']);

if (snapshot.project_ref !== expectedProject) {
  throw new Error('the readiness snapshot belongs to a different project');
}
if (!['pre_cutover', 'post_cutover'].includes(snapshot.phase)) {
  throw new Error('the Storage snapshot phase is missing or invalid');
}
if (snapshot.phase === 'pre_cutover' && snapshot.photos_bucket_public !== true) {
  throw new Error('expected the pre-cutover photos bucket to remain public');
}
if (snapshot.phase === 'post_cutover' && snapshot.photos_bucket_public !== false) {
  throw new Error('expected the post-cutover photos bucket to be private');
}
if (snapshot.missing_storage_path_rows !== 0) {
  throw new Error('photo rows without storage_path remain');
}
if (Number(snapshot.storage_policy_count) < 3) {
  throw new Error('the Storage policy baseline is incomplete');
}
if (snapshot.contains_user_data !== false) {
  throw new Error('the readiness snapshot must contain aggregate evidence only');
}
for (const warning of snapshot.security_warnings || []) {
  if (!allowedWarnings.has(warning)) {
    throw new Error(`unreviewed security warning: ${warning}`);
  }
}

console.log(`Supabase snapshot: ${snapshot.verified_at}`);
console.log(`Storage phase: ${snapshot.phase}`);
console.log(`Photo rows with missing storage paths: ${snapshot.missing_storage_path_rows}`);
console.log(`Storage policy count: ${snapshot.storage_policy_count}`);
NODE

if [[ "$MODE" == "--check" ]]; then
  printf 'Local private Storage contract and recorded cutover state are valid.\n'
  printf 'Refresh live Supabase evidence before future Storage policy changes.\n'
  exit 0
fi

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "dev" ]] ||
  fail "expected branch 'dev', found '$current_branch'."
[[ -z "$(git status --porcelain)" ]] ||
  fail "the Git worktree must be clean."

printf 'Refreshing release refs...\n'
git fetch --quiet origin dev main

read -r dev_behind dev_ahead <<<"$(git rev-list --left-right --count origin/dev...HEAD)"
[[ "$dev_behind" == "0" && "$dev_ahead" == "0" ]] ||
  fail "HEAD must exactly match origin/dev."
git merge-base --is-ancestor origin/main origin/dev ||
  fail "origin/main is not an ancestor of origin/dev."

npm run release:rehearse

printf '\nPrivate Storage verification passed without changing production or Supabase.\n'
printf 'The recorded cutover is complete; keep role and browser regression evidence current.\n'
