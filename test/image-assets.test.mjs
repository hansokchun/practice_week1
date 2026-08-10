import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('runtime image fallbacks are resolved through Vite-tracked asset URLs', async () => {
    const assets = await import('../js/image-assets.mjs');
    const sources = [
        readFileSync('js/app.js', 'utf8'),
        readFileSync('js/public-demo-data.mjs', 'utf8'),
        readFileSync('js/public-profile-hero.mjs', 'utf8')
    ].join('\n');

    assert.match(assets.MAIN_BG_1_URL, /main_bg1\.jpg$/);
    assert.match(assets.MAIN_BG_5_URL, /main_bg5\.jpg$/);
    assert.doesNotMatch(sources, /['"]images\/main_bg[1-5]\.jpg['"]/);
});
