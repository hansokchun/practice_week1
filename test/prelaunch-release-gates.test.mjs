import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('release rehearsal cannot declare readiness without checking the existing performance budgets', () => {
    const script = readFileSync(new URL('../scripts/rehearse-public-beta-release.sh', import.meta.url), 'utf8');
    assert.match(script, /npm run build\s+node scripts\/check-performance-budget\.mjs/);
});
