import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const runbook = () => readFileSync('docs/operations/public-beta-operations-runbook-2026-07-22.md', 'utf8');
const checklist = () => readFileSync('docs/product/public-beta-launch-checklist-2026-07-22.md', 'utf8');

test('incident runbook defines ownership, severity, and the first fifteen minutes', () => {
    const source = runbook();

    assert.match(source, /## Incident Contacts/);
    assert.match(source, /benet9827@gmail\.com/);
    assert.match(source, /## Severity And Response Targets/);
    assert.match(source, /SEV-1/);
    assert.match(source, /## First 15 Minutes/);
});

test('incident runbook links exact Cloudflare and Supabase log surfaces', () => {
    const source = runbook();

    assert.match(source, /Deployments > View details > Build log/);
    assert.match(source, /Deployments > View details > Functions/);
    assert.match(source, /wrangler pages deployment tail/);
    assert.match(source, /logs\/edge-logs/);
    assert.match(source, /logs\/auth-logs/);
    assert.match(source, /logs\/storage-logs/);
    assert.match(source, /logs\/postgres-logs/);
    assert.match(source, /logs-explorer/);
});

test('application rollback is reversible and reconciles Cloudflare with Git', () => {
    const source = runbook();

    assert.match(source, /preview deployments are not rollback targets/i);
    assert.match(source, /git revert <bad-release-sha>/);
    assert.match(source, /npm run perf:budget/);
    assert.doesNotMatch(source, /git reset --hard|git push --force/);
});

test('runbook protects privacy and records incident closeout evidence', () => {
    const source = runbook();

    assert.match(source, /Never paste passwords, access tokens, private photo URLs, or raw personal data/);
    assert.match(source, /Do not make the photos bucket public as a routine availability fix/);
    assert.match(source, /## Incident Record Template/);
    assert.match(source, /## Closeout/);
});

test('public beta checklist marks the single incident runbook complete', () => {
    assert.match(
        checklist(),
        /- \[x\] Write a single incident runbook with Cloudflare\/Supabase log paths, support contact, and rollback procedure\./
    );
});
