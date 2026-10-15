import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createAlbumDownloadPlan, createOfflineAlbum, renderOfflineAlbumMap } from '../js/album-download.mjs';

const album = { id: 'a', owner_id: 'owner', title: '서울 / 여행', note: '함께 남긴 기록', visibility: 'public' };
const photo = (id, extra = {}) => ({ id, owner_id: 'owner', album_id: 'a', visibility: 'public', lat: 37.5, lng: 127, ...extra });
const jpeg = 'data:image/jpeg;base64,/9j/2Q==';

test('album export preserves membership and excludes private photos for other viewers', () => {
    const photos = [photo('1'), photo('2', { visibility: 'private', shared: true }), photo('3', { owner_id: 'other' }), photo('4', { album_id: 'b' }), photo('1')];
    assert.deepEqual(createAlbumDownloadPlan(album, photos, null).photos.map(p => p.id), ['1']);
    assert.deepEqual(createAlbumDownloadPlan(album, photos, 'owner').photos.map(p => p.id), ['1', '2']);
    assert.throws(() => createAlbumDownloadPlan({ ...album, visibility: 'private' }, photos, 'other'), /볼 수 없는/);
    assert.equal(createAlbumDownloadPlan({ ...album, title: '' }, [photo('5', { album_id: null, album: '' })], 'owner').photos.length, 0);
    assert.equal(createAlbumDownloadPlan(album, [], 'owner').fileName, '서울-여행.html');
});

test('offline map is a large real geographic SVG without remote tiles or fabricated missing coordinates', () => {
    const svg = renderOfflineAlbumMap([photo('1'), photo('2', { lat: null, lng: null })]);
    assert.match(svg, /viewBox="0 0 1600 900"/);
    assert.match(svg, /Natural Earth/);
    assert.match(svg, /href="#photo-1"/);
    assert.doesNotMatch(svg, /href="#photo-2"|NaN|Infinity|googleapis|tile\.openstreetmap/);
    assert.match(renderOfflineAlbumMap([]), /위치가 저장된 사진이 없습니다/);
    for (const coords of [[179, -179], [0, 0], [127, 127]]) {
        assert.doesNotMatch(renderOfflineAlbumMap([photo('1', { lng: coords[0] }), photo('2', { lng: coords[1] })]), /NaN|Infinity/);
    }
});

test('offline album embeds every image, escapes content and excludes tokens, accounts and remote dependencies', async () => {
    const result = await createOfflineAlbum({
        album: { ...album, title: '<script>bad()</script>', note: '<img src=x onerror=bad()>' },
        photos: [photo('1', { description: '<iframe>unsafe</iframe>', url: 'https://private.test/photo?token=secret', storage_path: 'owner/private.jpg' }), photo('2', { lat: null, lng: null })],
        viewerId: 'owner', loadPhoto: async () => jpeg
    });
    assert.equal(result.count, 2);
    assert.equal((result.html.match(/src="data:image\/jpeg;base64,/g) || []).length, 2);
    assert.match(result.html, /&lt;script&gt;/);
    assert.match(result.html, /사진 위치 지도/);
    assert.doesNotMatch(result.html, /<script|<iframe|onerror=bad\(\)>|token=secret|owner\/private|owner_id|storage_path|<link/);
    assert.match(result.html, /script-src 'none'/);
    assert.match(result.html, /위치 없음/);
});

test('one failed image aborts export instead of silently saving a partial album', async () => {
    const progress = [];
    await assert.rejects(createOfflineAlbum({
        album, photos: [photo('1'), photo('2')], viewerId: 'owner',
        loadPhoto: async p => { if (p.id === '2') throw Error('offline'); return jpeg; },
        onProgress: value => progress.push(value)
    }), /offline/);
    assert.deepEqual(progress, [{ completed: 1, total: 2 }]);
});

test('export rejects remote image sources, oversized output and stale account/album work', async () => {
    const options = { album, photos: [photo('1')], viewerId: 'owner' };
    await assert.rejects(createOfflineAlbum({ ...options, loadPhoto: async () => 'https://signed.test/x' }), /사진 형식/);
    await assert.rejects(createOfflineAlbum({ ...options, loadPhoto: async () => jpeg, maxBytes: 4 }), /용량/);
    await assert.rejects(createOfflineAlbum({ ...options, loadPhoto: async () => jpeg, assertActive: () => { throw Error('cancelled'); } }), /cancelled/);
    await assert.rejects(createOfflineAlbum({ ...options, photos: [], loadPhoto: async () => jpeg }), /사진이 없습니다/);
});

test('album action is wired, loaded lazily and keeps individual photo download', () => {
    const app = readFileSync('js/app.js', 'utf8');
    const html = readFileSync('index.html', 'utf8');
    assert.match(app, /id="btn-download-album"/);
    assert.match(app, /import\('\.\/album-download\.mjs'\)/);
    assert.match(app, /downloadSelectedAlbum/);
    assert.match(html, /data-download-photo/);
    assert.match(html, /id="album-download-save"[^>]*hidden download/);
    assert.match(app, /saveLink\.download = result\.fileName/);
    assert.match(app, /albumDownloadJob\.abort\(\)/);
});
