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

test('private Storage cutover history and later sample cleanup remain explicit', () => {
  assert.match(storagePlan, /samples were retained as useful QA fixtures/i);
  assert.match(storagePlan, /no reset was needed/i);
  assert.match(storagePlan, /made the `photos` bucket private/i);
  assert.match(decision, /2026-08-10 cleanup execution/i);
  assert.match(decision, /21 photo rows/i);
  assert.match(decision, /3 album rows/i);
  assert.match(decision, /Auth accounts and profiles remained at 3/i);
  assert.match(decision, /all 31 Storage files and 2 empty-folder placeholders were removed/i);
  assert.match(decision, /Storage object count is 0/i);
  assert.match(checklist, /Database sample cleanup \| Passing/i);
  assert.match(checklist, /Storage sample cleanup \| Passing/i);
  assert.match(checklist, /0 objects remain in the private `photos` bucket/i);
});
