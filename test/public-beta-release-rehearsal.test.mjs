import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const script = () => readFileSync('scripts/rehearse-public-beta-release.sh', 'utf8');
const record = () => readFileSync('docs/operations/public-beta-release-rehearsal-2026-07-26.md', 'utf8');
const candidateRecord = () => readFileSync('docs/operations/public-beta-release-candidate-2026-07-27.md', 'utf8');
const checklist = () => readFileSync('docs/product/public-beta-launch-checklist-2026-07-22.md', 'utf8');
const packageJson = () => JSON.parse(readFileSync('package.json', 'utf8'));

test('package exposes a repeatable public beta release rehearsal', () => {
    assert.equal(
        packageJson().scripts['release:rehearse'],
        'bash scripts/rehearse-public-beta-release.sh'
    );
});

test('release rehearsal verifies branch state, tests, and production build', () => {
    const source = script();

    assert.match(source, /git status --porcelain/);
    assert.match(source, /origin\/dev/);
    assert.match(source, /npm test/);
    assert.match(source, /npm run build/);
});

test('release rehearsal smoke-checks the deployed shell, config, assets, and security headers', () => {
    const source = script();

    assert.match(source, /page-home/);
    assert.match(source, /page-explore/);
    assert.match(source, /auth-modal/);
    assert.match(source, /api\/config/);
    assert.match(source, /content-security-policy/);
    assert.match(source, /x-content-type-options/);
    assert.match(source, /\/assets\//);
});

test('rollback rehearsal is non-destructive and uses reversible recovery', () => {
    const source = script();

    assert.match(source, /Rollback rehearsal only/);
    assert.match(source, /git revert <bad-release-sha>/);
    assert.doesNotMatch(source, /git reset --hard|git push --force/);
    assert.doesNotMatch(source, /git push origin main/);
});

test('release record preserves blockers and checklist marks rehearsal complete', () => {
    const source = record();

    assert.match(source, /origin\/main.*448 commits behind.*origin\/dev/i);
    assert.match(source, /No production deployment was performed/i);
    assert.match(source, /backup and restore rehearsal/i);
    assert.match(source, /real-device authentication QA/i);
    assert.match(source, /private-bucket cutover/i);
    assert.match(
        checklist(),
        /- \[x\] Rehearse the production deployment, smoke test, and rollback path before public traffic\./
    );
});

test('latest release candidate records immutable evidence without approving production', () => {
    const source = candidateRecord();

    assert.match(source, /ed19c3582b05/);
    assert.match(source, /457 commits/);
    assert.match(source, /423 passing, 0 failing/i);
    assert.match(source, /https:\/\/dev\.practice-week1-cws\.pages\.dev/);
    assert.match(source, /No `main` push/i);
    assert.match(source, /No Supabase data deletion/i);
    assert.match(source, /4 P0 gates remain/i);
});
