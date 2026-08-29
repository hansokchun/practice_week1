import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260824124935_add_mobile_profile_editing.sql", import.meta.url);

test("mobile profile migration constrains managed avatars and least-privilege storage operations", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /add column if not exists avatar_path text not null default ''/iu);
  assert.match(sql, /profiles_mobile_avatar_path_check/iu);
  assert.match(sql, /insert into storage\.buckets/iu);
  assert.match(sql, /file_size_limit/iu);
  assert.match(sql, /image\/jpeg/iu);
  assert.match(sql, /for insert\s+to authenticated/iu);
  assert.match(sql, /for select\s+to authenticated/iu);
  assert.match(sql, /for delete\s+to authenticated/iu);
  assert.doesNotMatch(sql, /for update\s+to authenticated/iu);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)::text\)/iu);
  assert.match(sql, /revoke all on function public\.enforce_mobile_profile_fields\(\) from public/iu);
});
