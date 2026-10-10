import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShareResponse } from '../functions/_shared/share-preview.mjs';

const photo = { id: 'p1', visibility: 'public', title: '<여행>', preview_path: 'owner/preview.jpg' };
const request = path => new Request(`https://example.com/share/${path}`);
test('share pages expose escaped OG metadata and a photo destination', async () => {
    const response = await createShareResponse(request('photo/p1'), ['photo', 'p1'], async () => Response.json([photo]));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /property="og:image" content="https:\/\/example.com\/share\/photo\/p1\?image=1"/);
    assert.match(html, /&lt;여행&gt;/);
    assert.match(html, /\/#\/\?photo=p1/);
    assert.match(response.headers.get('cache-control'), /no-store/);
});
test('private or deleted photos and albums never expose a thumbnail or redirect', async () => {
    for (const type of ['photo', 'album']) {
        for (const rows of [[], [{ ...photo, visibility: 'private' }]]) {
            const response = await createShareResponse(request(`${type}/p1?image=1`), [type, 'p1'], async () => Response.json(rows));
            assert.equal(response.status, 404);
            assert.doesNotMatch(await response.text(), /preview.jpg/);
        }
    }
});
test('album thumbnail is chosen only from its public member photos, never an arbitrary cover URL', async () => {
    const calls = [];
    const response = await createShareResponse(request('album/a1?image=1'), ['album', 'a1'], async url => {
        calls.push(String(url));
        if (String(url).includes('/albums?')) return Response.json([{ id: 'a1', visibility: 'public', cover_url: 'https://private/image.jpg' }]);
        if (String(url).includes('/album_photos?')) return Response.json([{ photos: photo }]);
        return new Response('pixels', { headers: { 'content-type': 'image/jpeg' } });
    });
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.equal(await response.text(), 'pixels');
    assert.ok(calls.some(url => url.includes('photos.visibility=eq.public')));
    assert.ok(calls.every(url => !url.includes('private/image')));
});
test('invalid IDs and upstream outages return non-cacheable errors', async () => {
    assert.equal((await createShareResponse(request('photo/p1'), ['nope', 'p1'])).status, 404);
    const response = await createShareResponse(request('photo/p1'), ['photo', 'p1'], async () => { throw new Error('down'); });
    assert.equal(response.status, 503);
});
