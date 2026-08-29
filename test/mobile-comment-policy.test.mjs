import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url);

function commentMigration() {
  const name = readdirSync(migrationsDirectory)
    .filter((candidate) => candidate.endsWith('_secure_mobile_comments.sql'))
    .at(0);
  assert.ok(name, 'secure mobile comments migration is required');
  return readFileSync(new URL(name, migrationsDirectory), 'utf8');
}

test('mobile comments constrain content, ownership, and submission rate', () => {
  const sql = commentMigration();
  assert.match(sql, /comments_text_length_check[\s\S]*char_length\s*\(\s*btrim\s*\(\s*text\s*\)\s*\)[\s\S]*between 1 and 1000[\s\S]*not valid/i);
  assert.match(sql, /create policy "?comments_delete_own"?[\s\S]*for delete[\s\S]*to authenticated[\s\S]*author_id[\s\S]*auth\.uid/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
  assert.match(sql, /interval '60 seconds'/i);
  assert.match(sql, />= 5/i);
  assert.match(sql, /new\.date\s*:=\s*now\(\)/i);
  assert.match(sql, /create trigger comments_enforce_submission_limits[\s\S]*before insert/i);
  assert.match(sql, /revoke all on function public\.enforce_comment_submission_limits\(\) from public, anon, authenticated/i);
  assert.match(sql, /comments_author_date_idx/i);
  assert.doesNotMatch(sql, /service[_-]?role|sb_secret_/i);
});
