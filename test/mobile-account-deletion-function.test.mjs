import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const functionUrl = new URL("../supabase/functions/delete-account/index.ts", import.meta.url);

test("account deletion function authenticates the caller and cleans Storage before Auth", async () => {
  const source = await readFile(functionUrl, "utf8");

  assert.match(source, /auth\.getUser\(accessToken\)/u);
  assert.match(source, /confirmation !== "DELETE_ACCOUNT"/u);
  assert.match(source, /storage\.from\(bucket\)\.remove/u);
  assert.match(source, /deleteOwnedRows/u);
  assert.match(source, /auth\.admin\.deleteUser\(user\.id\)/u);
  assert.ok(source.indexOf("removeOwnedObjects") < source.indexOf("deleteOwnedRows"));
  assert.ok(source.indexOf("deleteOwnedRows") < source.indexOf("auth.admin.deleteUser"));
  assert.doesNotMatch(source, /console\.(?:log|error|warn)/u);
  assert.doesNotMatch(source, /user_metadata|raw_user_meta_data/u);
});
