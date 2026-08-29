import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url);
const functionSourceUrl = new URL('../supabase/functions/photo-link/index.ts', import.meta.url);
const configUrl = new URL('../supabase/config.toml', import.meta.url);

function linkMigration() {
  const name = readdirSync(migrationsDirectory)
    .filter((candidate) => candidate.endsWith('_secure_mobile_photo_links.sql'))
    .at(0);
  assert.ok(name, 'secure mobile photo link migration is required');
  return readFileSync(new URL(name, migrationsDirectory), 'utf8');
}

test('mobile link tokens are hashed and constrained to private unshared photos', () => {
  const sql = linkMigration();
  assert.match(sql, /add column if not exists link_token_hash text/i);
  assert.match(sql, /add column if not exists link_token_created_at timestamp with time zone/i);
  assert.match(sql, /link_token_hash ~ '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(sql, /visibility = 'private'/i);
  assert.match(sql, /shared is false/i);
  assert.match(sql, /create unique index[^;]+link_token_hash/is);
  assert.doesNotMatch(sql, /service[_-]?role|sb_secret_/i);
});

test('public link resolver returns only a token-matched safe projection and short signed URL', () => {
  const source = readFileSync(functionSourceUrl, 'utf8');
  const config = readFileSync(configUrl, 'utf8');
  assert.match(config, /\[functions\.photo-link\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(source, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source, /\.eq\("link_token_hash", tokenHash\)/);
  assert.match(source, /\.eq\("visibility", "private"\)/);
  assert.match(source, /\.eq\("shared", false\)/);
  assert.match(source, /createSignedUrl\(photo\.storage_path, 300\)/);
  assert.match(source, /"Cache-Control": "no-store"/);
  assert.match(source, /json\(request, \{ error: "not_found" \}, 404\)/);
  assert.doesNotMatch(source, /select\([^)]*(?:lat|lng|link_token_hash)/i);
  assert.doesNotMatch(source, /console\.(?:log|error|warn)/);
});
