import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(mobileRoot, '..');

function source(path) {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function collectRuntimeSources(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') collectRuntimeSources(path, result);
    } else if (entry.isFile() && ['.ts', '.tsx', '.swift', '.kt', '.m'].includes(extname(entry.name)) &&
      !/\.test\.[^.]+$/u.test(entry.name)) result.push(path);
  }
  return result;
}

const checks = [];
function check(id, callback) {
  callback();
  checks.push(id);
}

check('auth-redirect', () => {
  const callback = source('mobile/src/auth-callback.ts');
  const oauth = source('mobile/src/oauth-auth.ts');
  const email = source('mobile/src/email-auth.ts');
  const screen = source('mobile/app/auth/callback.tsx');
  assert.match(callback, /parsedUrl\.protocol !== "ikkyee:"/u);
  assert.match(callback, /parsedUrl\.hostname !== "auth"/u);
  assert.match(callback, /parsedUrl\.pathname !== "\/callback"/u);
  assert.match(oauth, /requireTrustedAuthCallbackUrl\(callbackUrl\)/u);
  assert.match(email, /requireTrustedAuthCallbackUrl\(callbackUrl\)/u);
  assert.match(oauth, /url\.protocol !== "https:"/u);
  assert.doesNotMatch(screen, /error\.message/u);
});

check('session-and-local-storage', () => {
  const client = source('mobile/src/supabase-client.ts');
  const nativeStorage = source('mobile/src/native-local-photo-storage.ts');
  assert.match(client, /Platform\.OS === "web" \? AsyncStorage : createChunkedSecureStorage\(SecureStore\)/u);
  assert.match(client, /detectSessionInUrl: false/u);
  assert.match(client, /flowType: "pkce"/u);
  assert.match(client, /service\[_-\]\?role\|secret/iu);
  assert.match(nativeStorage, /trustedRootKind"\) !== "no-backup-files"/u);
  assert.match(nativeStorage, /nativeBackupExclusion"\) !== "verified"/u);
});

check('privacy-safe-logs', () => {
  const releaseAudit = source('mobile/scripts/audit-release-artifacts.mjs');
  assert.match(releaseAudit, /sensitive-log/u);
  assert.match(releaseAudit, /precise-coordinate/u);
  const runtimeFiles = ['app', 'src', 'modules'].flatMap((path) => collectRuntimeSources(resolve(mobileRoot, path)));
  for (const path of runtimeFiles) {
    assert.doesNotMatch(
      readFileSync(path, 'utf8'),
      /console\.(?:debug|error|info|log|warn)\s*\(/u,
      `runtime console output is not approved: ${relative(mobileRoot, path)}`,
    );
  }
});

check('private-share-links', () => {
  const link = source('mobile/src/publication-link-token.ts');
  const publisher = source('mobile/src/publication-publisher.ts');
  const functionSource = source('supabase/functions/photo-link/index.ts');
  const migration = source('supabase/migrations/20260824113903_secure_mobile_photo_links.sql');
  assert.match(link, /\/photo-link#\$\{token\}/u);
  assert.match(publisher, /link_token_hash/u);
  assert.doesNotMatch(publisher, /link_token:\s/u);
  assert.match(migration, /Raw tokens never enter Postgres/u);
  assert.match(functionSource, /createSignedUrl\(photo\.storage_path, 300\)/u);
  assert.match(functionSource, /"Cache-Control": "no-store"/u);
  assert.doesNotMatch(functionSource, /\.select\([^\n]*(?:lat|lng)/u);
});

check('rls-and-definer-functions', () => {
  const migrationNames = readdirSync(resolve(repoRoot, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
  const sql = migrationNames.map((name) => source(`supabase/migrations/${name}`)).join('\n');
  assert.doesNotMatch(sql, /auth\.role\s*\(/iu);
  assert.doesNotMatch(sql, /auth\.jwt\s*\(\)[^\n]*(?:raw_)?user_meta_data/iu);
  for (const table of [
    'profiles', 'photos', 'photo_private_locations', 'comments', 'user_likes', 'user_blocks', 'content_reports'
  ]) assert.match(sql, new RegExp(`ALTER TABLE ["']?public["']?\\.["']?${table}["']? ENABLE ROW LEVEL SECURITY`, 'iu'));
  for (const functionName of [
    'apply_photo_location_privacy', 'decrement_like', 'handle_new_user', 'increment_like',
    'set_photo_like', 'enforce_comment_submission_limits', 'enforce_user_block_insert',
    'enforce_content_report_submission', 'enforce_mobile_profile_fields'
  ]) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION [^\\n]*${functionName}`, 'iu'),
      `SECURITY DEFINER or trigger function lacks an explicit PUBLIC revoke: ${functionName}`);
  }
  const like = source('supabase/migrations/20260810092619_synchronize_photo_likes.sql');
  assert.match(like, /current_user_id uuid := auth\.uid\(\)/u);
  assert.match(like, /REVOKE ALL ON FUNCTION public\.set_photo_like\(text, boolean\) FROM PUBLIC/u);
  assert.match(like, /GRANT EXECUTE ON FUNCTION public\.set_photo_like\(text, boolean\) TO authenticated/u);
});

check('storage-boundary', () => {
  const photos = source('supabase/migrations/20260825085451_restore_private_photo_storage_policies.sql');
  const avatars = source('supabase/migrations/20260824124935_add_mobile_profile_editing.sql');
  assert.match(photos, /values \('photos', 'photos', false\)/u);
  assert.match(photos, /owner_id = \(select auth\.uid\(\)::text\)/u);
  assert.match(photos, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/u);
  assert.match(avatars, /values \('avatars', 'avatars', true/u);
  assert.match(avatars, /owner_id = \(select auth\.uid\(\)::text\)/u);
});

process.stdout.write(`${JSON.stringify({ status: 'PASS', checkCount: checks.length, checks })}\n`);
