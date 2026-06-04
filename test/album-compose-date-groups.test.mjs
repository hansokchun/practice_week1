import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('album compose groups photos by capture date without Day labels', () => {
    assert.match(source, /function getAlbumPhotoDayGroups\(photos = \[\]\)/);
    assert.match(source, /photos\.slice\(\)\.sort\(\(a, b\) => getTime\(a\) - getTime\(b\)\)/);
    assert.match(source, /return `\$\{month\}월 \$\{day\}일`;/);
    assert.equal(source.includes('label: date ==='), false);
    assert.equal(source.includes('<span>${day.label}</span>'), false);
});
