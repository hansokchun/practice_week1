import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const files = ['index.html', 'js/app.js'];
const brokenCopyFragments = [
    '怨', '鍮', '留', '寃', '洹', '諛', '珥', '媛',
    '쨌', '횞',
    '?섏', '?낅', '?꾩', '?ъ', '?⑤', '?좎', '?뚯', '?곗', '?', '?ㅻ', '?リ'
];

test('user-facing source copy does not contain mojibake fragments', () => {
    const offenders = [];
    files.forEach((file) => {
        const source = readFileSync(file, 'utf8');
        brokenCopyFragments.forEach((fragment) => {
            if (source.includes(fragment)) offenders.push(`${file}: ${fragment}`);
        });
    });

    assert.deepEqual(offenders, []);
});
