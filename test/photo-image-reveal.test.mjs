import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('site photos stay hidden until the current image source is fully decoded', () => {
    assert.match(app, /function initializePhotoImageReveal\(\)/);
    assert.match(app, /MutationObserver/);
    assert.match(app, /attributeFilter:\s*\['src'\]/);
    assert.match(app, /await image\.decode\(\)/);
    assert.match(app, /image\.complete && image\.naturalWidth > 0/);
    assert.match(app, /image\.classList\.add\('is-photo-ready'\)/);
    assert.match(app, /initializePhotoImageReveal\(\);/);
    assert.match(app, /data-photo-reveal/);
    assert.match(html, /data-photo-detail-image[^>]*data-photo-reveal|data-photo-reveal[^>]*data-photo-detail-image/);
    assert.match(css, /img\[data-photo-reveal\]:not\(\.is-photo-ready\)\s*\{[^}]*opacity:\s*0;/s);
    assert.match(css, /img\[data-photo-reveal\]\.is-photo-ready\s*\{[^}]*opacity:\s*1;/s);
});

test('photo URLs are recovered in batches only when images approach the viewport', () => {
    assert.match(app, /function observePhotoImageUrl\(image\)/);
    assert.match(app, /new IntersectionObserver/);
    assert.match(app, /rootMargin:\s*'250px 0px'/);
    assert.match(app, /function queuePhotoImageUrlRecovery\(image\)/);
    assert.match(app, /async function flushPhotoImageUrlRecoveryQueue\(\)/);
    assert.match(app, /await hydratePhotoUrls\(photosToHydrate\)/);
    assert.match(app, /if \(!source\)\s*\{\s*observePhotoImageUrl\(image\);\s*return;/s);
});
