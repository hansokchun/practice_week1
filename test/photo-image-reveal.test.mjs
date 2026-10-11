import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

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
    assert.match(css, /\.photo-masonry-grid img\[data-photo-reveal\]:not\(\.is-photo-ready\)\s*\{[^}]*aspect-ratio:\s*4 \/ 5;/s);
});

test('photo URLs are recovered in batches only when images approach the viewport', () => {
    assert.match(app, /function observePhotoImageUrl\(image, \{ retry = false \} = \{\}\)/);
    assert.match(app, /new IntersectionObserver/);
    assert.match(app, /rootMargin:\s*'120px 0px'/);
    assert.match(app, /function queuePhotoImageUrlRecovery\(image\)/);
    assert.match(app, /async function flushPhotoImageUrlRecoveryQueue\(\)/);
    assert.match(app, /await hydratePhotoUrls\(photosToHydrate\)/);
    assert.match(app, /if \(!source\)\s*\{\s*observePhotoImageUrl\(image\);\s*return;/s);
});

test('an already failed cached image starts recovery even when its error event was missed', async () => {
    let recoveries = 0;
    class Image {
        dataset = { i: 'cached-photo' };
        classes = new Set();
        complete = true;
        naturalWidth = 0;
        classList = {
            add: (...names) => names.forEach(name => this.classes.add(name)),
            remove: (...names) => names.forEach(name => this.classes.delete(name))
        };
        hasAttribute() { return false; }
        setAttribute() {}
        getAttribute() { return '/expired-thumbnail.jpg'; }
        closest() { return {}; }
        addEventListener() {}
        async decode() { throw new Error('cached failure'); }
    }
    const source = app.slice(app.indexOf('function isPhotoImageRevealCandidate'), app.indexOf('function observePhotoImageUrl'));
    const prepare = runInNewContext(`${source}; preparePhotoImageReveal`, {
        HTMLImageElement: Image,
        photoImageRevealObserved: new WeakSet(),
        recoverPhotoImageUrl: () => { recoveries++; }
    });
    const image = new Image();
    prepare(image);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(recoveries, 1);
});

test('cached image preparation still listens for later successful loads', async () => {
    const listeners = new Map();
    class Image {
        dataset = { i: 'late-photo' };
        classes = new Set();
        complete = true;
        naturalWidth = 0;
        classList = {
            add: (...names) => names.forEach(name => this.classes.add(name)),
            remove: (...names) => names.forEach(name => this.classes.delete(name)),
            contains: name => this.classes.has(name)
        };
        hasAttribute() { return false; }
        setAttribute() {}
        getAttribute() { return '/retry-thumbnail.jpg'; }
        closest() { return {}; }
        addEventListener(name, listener) { listeners.set(name, listener); }
        async decode() {}
    }
    const source = app.slice(app.indexOf('function isPhotoImageRevealCandidate'), app.indexOf('function observePhotoImageUrl'));
    const prepare = runInNewContext(`${source}; preparePhotoImageReveal`, {
        HTMLImageElement: Image, photoImageRevealObserved: new WeakSet(), recoverPhotoImageUrl() {}
    });
    const image = new Image();
    prepare(image);
    await new Promise(resolve => setImmediate(resolve));
    image.naturalWidth = 640;
    listeners.get('load')?.();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(image.classes.has('is-photo-ready'));
    assert.ok(!image.classes.has('is-photo-error'));
});

test('page, library tab, online, and restored browser visits recheck visible photo images', () => {
    assert.match(app, /function refreshVisiblePhotoImages\(/);
    const route = app.slice(app.indexOf('function renderRoute('), app.indexOf('async function refreshExploreMapAfterRouteEntry'));
    assert.match(route, /refreshVisiblePhotoImages/);
    const tab = app.slice(app.indexOf('function setMyLibraryTab('), app.indexOf('function syncPhotosAlbumList'));
    assert.match(tab, /refreshVisiblePhotoImages/);
    assert.match(app, /window\.addEventListener\('online',[\s\S]*refreshVisiblePhotoImages/);
    assert.match(app, /window\.addEventListener\('pageshow',[\s\S]*refreshVisiblePhotoImages/);
});
