import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checklist = readFileSync('docs/mobile/prelaunch-checklist.md', 'utf8');
const mobilePackage = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
const schemaVerifier = readFileSync('mobile/scripts/verify-local-schema.mjs', 'utf8');

test('mobile prelaunch checklist is a fixed append-only release ledger', () => {
    assert.match(checklist, /Do not delete or renumber an item/);
    assert.match(checklist, /Complete work by changing `\[ \]` to `\[x\]`/);
    assert.match(checklist, /The mobile app remains album-free/);
});

test('mobile prelaunch checklist distinguishes foundations from production integration', () => {
    assert.match(checklist, /- \[x\] Create the Expo Router application scaffold/);
    assert.match(checklist, /- \[x\] Implement and test the SQLite schema and migration runner/);
    assert.match(checklist, /- \[ \] Install and configure the production Supabase client/);
    assert.match(checklist, /- \[ \] Connect a production map SDK/);
    assert.match(checklist, /- \[ \] Produce reproducible iOS and Android development builds/);
});

test('mobile schema verification runs every release scenario from one command', () => {
    assert.equal(
        mobilePackage.scripts['schema:verify'],
        'node ./scripts/verify-local-schema.mjs --scenario all'
    );
    assert.match(schemaVerifier, /case "all":/);
    assert.match(schemaVerifier, /verifyInvalidMigrationRejection/);
});
