import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

function thumbnailFixture({ source = '', complete = true, width = 0, atomic = false } = {}) {
    const classes = new Set();
    const hostClasses = new Set();
    const listeners = new Map();
    let timeout;
    const classList = (values) => ({
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        contains: name => values.has(name)
    });
    const image = {
        dataset: {}, src: source, complete, naturalWidth: width,
        classList: classList(classes),
        getAttribute: name => name === 'src' ? image.src : null,
        closest: () => ({ classList: classList(hostClasses) }),
        decode: async () => {},
        addEventListener: (name, callback, options) => {
            const entries = listeners.get(name) || [];
            entries.push({ callback, once: options?.once });
            listeners.set(name, entries);
        }
    };
    const containerClasses = new Set();
    const container = {
        dataset: {}, classList: classList(containerClasses),
        querySelectorAll: () => [image],
        closest: () => null, setAttribute() {}, removeAttribute() {}
    };
    const sourceCode = app.slice(app.indexOf('function revealPhotoThumbnailGridWhenReady'), app.indexOf('function setPhotoImageSource'));
    const reveal = runInNewContext(`${sourceCode}; revealPhotoThumbnailGridWhenReady`, {
        PHOTO_THUMBNAIL_EAGER_COUNT: 4,
        PHOTO_THUMBNAIL_REVEAL_TIMEOUT_MS: 8000,
        LANDING_TAG_THUMBNAIL_REVEAL_TIMEOUT_MS: 15000,
        window: { setTimeout: callback => { timeout = callback; return 1; }, clearTimeout() {} }
    });
    const fire = async (name) => {
        const entries = listeners.get(name) || [];
        listeners.set(name, entries.filter(entry => !entry.once));
        entries.forEach(entry => entry.callback());
        await new Promise(resolve => setImmediate(resolve));
    };
    reveal(container, { atomic });
    return { image, classes, hostClasses, containerClasses, fire, expire: () => timeout() };
}

test('a thumbnail without a URL is revealed when its signed URL arrives later', async () => {
    const fixture = thumbnailFixture();
    await new Promise(resolve => setImmediate(resolve));
    fixture.image.src = '/signed-thumbnail.jpg';
    fixture.image.complete = true;
    fixture.image.naturalWidth = 640;
    await fixture.fire('load');
    assert.ok(fixture.classes.has('is-thumbnail-ready'));
    assert.ok(!fixture.classes.has('is-thumbnail-error'));
    assert.ok(!fixture.classes.has('is-thumbnail-pending'));
    assert.ok(!fixture.hostClasses.has('is-thumbnail-loading'));
});

test('a cached failed thumbnail is revealed after URL recovery', async () => {
    const fixture = thumbnailFixture({ source: '/expired.jpg' });
    await new Promise(resolve => setImmediate(resolve));
    fixture.image.src = '/fresh.jpg';
    fixture.image.naturalWidth = 640;
    await fixture.fire('load');
    assert.ok(fixture.classes.has('is-thumbnail-ready'));
    assert.ok(!fixture.classes.has('is-thumbnail-error'));
});

test('a delayed tag thumbnail is still revealed after the batch timeout', async () => {
    const fixture = thumbnailFixture({ source: '/slow.jpg', complete: false, atomic: true });
    fixture.expire();
    assert.ok(!fixture.containerClasses.has('is-thumbnail-batch-loading'));
    fixture.image.complete = true;
    fixture.image.naturalWidth = 640;
    await fixture.fire('load');
    assert.ok(fixture.classes.has('is-thumbnail-ready'));
    assert.ok(!fixture.classes.has('is-thumbnail-error'));
});

test('a thumbnail that fails during loading is revealed when its fallback succeeds', async () => {
    const fixture = thumbnailFixture({ source: '/broken.jpg', complete: false });
    await fixture.fire('error');
    fixture.image.src = '/preview.jpg';
    fixture.image.complete = true;
    fixture.image.naturalWidth = 640;
    await fixture.fire('load');
    assert.ok(fixture.classes.has('is-thumbnail-ready'));
    assert.ok(!fixture.classes.has('is-thumbnail-error'));
});

test('already decoded thumbnails keep listening after a later source error and recovery', async () => {
    const fixture = thumbnailFixture({ source: '/cached.jpg', width: 640 });
    await fixture.fire('load');
    fixture.image.src = '/expired.jpg';
    fixture.image.naturalWidth = 0;
    await fixture.fire('error');
    fixture.image.src = '/renewed.jpg';
    fixture.image.naturalWidth = 640;
    await fixture.fire('load');
    assert.ok(fixture.classes.has('is-thumbnail-ready'));
    assert.ok(!fixture.classes.has('is-thumbnail-error'));
});

test('photo thumbnail grids reveal independently by default and can reveal a tag page atomically', () => {
    assert.match(app, /function revealPhotoThumbnailGridWhenReady\(container, \{ atomic = false \} = \{\}\)/);
    assert.match(app, /PHOTO_THUMBNAIL_REVEAL_TIMEOUT_MS = 8000/);
    assert.match(app, /images\.slice\(0, atomic \? images\.length : PHOTO_THUMBNAIL_EAGER_COUNT\)/);
    assert.match(app, /image\.decode\(\)/);
    assert.match(app, /image\.classList\.add\('is-thumbnail-ready'\)/);
    assert.match(app, /image\.classList\.add\('is-thumbnail-error'\)/);
    assert.match(app, /window\.setTimeout/);
    assert.doesNotMatch(app, /Promise\.all\(images\.map/);
    assert.doesNotMatch(css, /\.personal-photo-grid\.is-loading-thumbnails img\s*\{[^}]*visibility:\s*hidden;/s);
    assert.match(css, /\.personal-photo-grid img\.is-thumbnail-pending,[^}]*opacity:\s*0;/s);
});

test('personal and liked photo grids use the full panel width without frames', () => {
    assert.doesNotMatch(css, /\.personal-photo-grid\s*\{[^}]*max-width:\s*1040px;/s);
    assert.match(css, /\.personal-photo-card\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.match(css, /body\[data-page="photos"\] \.dashboard-panel,[\s\S]*body\[data-page="liked"\] \.dashboard-panel\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;[^}]*padding:\s*0;/s);
});

test('personal and liked full pages use the profile masonry layout', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="personal-photo-grid" class="personal-photo-grid photo-masonry-grid"/);
    assert.match(html, /id="liked-photo-full-grid" class="personal-photo-grid liked-photo-full-grid photo-masonry-grid"/);
});
