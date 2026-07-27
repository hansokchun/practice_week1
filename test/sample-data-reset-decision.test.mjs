import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const decision = readFileSync(
  'docs/product/sample-data-reset-decision-2026-07-27.md',
  'utf8'
);
const checklist = readFileSync(
  'docs/product/public-beta-launch-checklist-2026-07-22.md',
  'utf8'
);
const storagePlan = readFileSync(
  'docs/product/storage-private-transition-plan-2026-06-05.md',
  'utf8'
);

test('launch plan treats current content as disposable sample data', () => {
  assert.match(decision, /current pre-launch content is disposable sample data/i);
  assert.match(decision, /photos, albums, comments, likes, and location records/i);
  assert.match(decision, /Storage objects/i);
  assert.match(decision, /Auth accounts.*not.*deletion scope/i);
  assert.match(decision, /Do not spend migration time preserving sample content/i);
});

test('private Storage cutover uses fresh minimal QA fixtures', () => {
  assert.match(storagePlan, /delete the current sample content/i);
  assert.match(storagePlan, /fresh minimal three-account QA fixtures/i);
  assert.match(storagePlan, /make the `photos` bucket private/i);
  assert.match(checklist, /Existing sample content may be deleted instead of migrated/i);
  assert.match(checklist, /Create only the minimum three-account QA fixtures/i);
});
