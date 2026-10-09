import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { uploadLandingHeroPhoto } from '../js/landing-hero-upload.mjs';

function dependencies(failAt = '') {
    const removed = [];
    const deps = {
        optimize: async file => file,
        createThumbnail: async () => ({ name: 'thumb.jpg' }),
        createPreview: async () => ({ name: 'preview.jpg' }),
        upload: async (_file, path) => ({ url: 'signed:' + path, storagePath: path }),
        uploadVariant: async (_file, path) => failAt === 'variant'
            ? { error: new Error('variant failed') }
            : { url: 'signed:' + path, storagePath: path },
        save: async () => ({ error: failAt === 'save' ? new Error('save failed') : null }),
        remove: async path => removed.push(path)
    };
    return { deps, removed };
}

test('local hero photos persist originals and optimized display variants under their owner', async () => {
    const { deps, removed } = dependencies();
    const record = await uploadLandingHeroPhoto({ name: 'photo.jpg' }, { ownerId: 'admin', id: 'unique' }, deps);
    assert.equal(record.storage_path, 'admin/landing/unique.jpg');
    assert.equal(record.thumbnail_path, 'admin/thumbnails/unique.jpg');
    assert.equal(record.preview_path, 'admin/previews/unique.jpg');
    assert.equal(record.visibility, 'public');
    assert.equal(record.owner_id, 'admin');
    assert.equal(record.lat, null);
    assert.equal(record.lng, null);
    assert.ok(record.signed_url_expires_at > Date.now());
    assert.deepEqual(removed, []);
});

for (const failure of ['variant', 'save']) {
    test(`failed hero ${failure} cleans only newly uploaded objects`, async () => {
        const { deps, removed } = dependencies(failure);
        await assert.rejects(uploadLandingHeroPhoto({ name: 'photo.jpg' }, { ownerId: 'admin', id: 'new' }, deps));
        assert.ok(removed.includes('admin/landing/new.jpg'));
        if (failure === 'save') assert.equal(removed.length, 3);
    });
}

test('hero local picker keeps admin authorization, seven-slide limit and manual location input', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    assert.match(html, /id="landing-hero-file-input"[^>]*type="file"[^>]*multiple/);
    const body = app.slice(app.indexOf('async function handleLandingHeroFiles'), app.indexOf('function renderLandingAdminHeroForm'));
    assert.match(body, /isLandingAdmin\(state.currentUser\)/);
    assert.match(body, /LANDING_HERO_SLIDE_LIMIT/);
    assert.match(app, /const LANDING_HERO_SLIDE_LIMIT = 7;/);
    assert.match(readFileSync('auth.js', 'utf8'), /\}\)\.slice\(0, 7\)/);
    assert.match(readFileSync('supabase/migrations/20261009173522_allow_admin_landing_uploads_and_seven_slides.sql', 'utf8'), /sort_order between 0 and 6/);
    assert.match(body, /filterAcceptedPhotoFiles/);
    assert.match(body, /uploadLandingHeroPhoto/);
    assert.match(app, /class="admin-hero-location-field"/);
    assert.match(app, /if \(manualLabel\) return manualLabel;/);
    assert.match(app, /locationLabel: String\(state.landingHeroLocationLabels\[photoId\] \|\| ''\)\.trim\(\)\.slice\(0, 80\)/);
});
