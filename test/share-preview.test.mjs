import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShareResponse } from '../functions/_shared/share-preview.mjs';

const photo = { id: 'p1', owner_id: 'owner', visibility: 'public', title: '<여행>', preview_path: 'owner/preview.jpg' };
const request = path => new Request(`https://example.com/share/${path}`);
test('share pages expose escaped OG metadata and a photo destination', async () => {
    const response = await createShareResponse(request('photo/p1'), ['photo', 'p1'], async () => Response.json([photo]));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /property="og:image" content="https:\/\/example.com\/share\/photo\/p1\?v=2&amp;image=1"/);
    assert.match(html, /&lt;여행&gt;/);
    assert.match(html, /property="og:description" content="장소 아카이브"/);
    assert.match(html, /\/#\/\?photo=p1/);
    assert.match(response.headers.get('cache-control'), /no-store/);
});
test('album sharing serves the selected public member derivative even when it is not first', async () => {
    const calls = [];
    const response = await createShareResponse(request('album/a1?image=1'), ['album','a1'], async input => {
        const url = new URL(input); calls.push(url);
        if (url.pathname.endsWith('/albums')) return Response.json([{ id:'a1',visibility:'public',cover_url:'https://project.supabase.co/storage/v1/object/sign/photos/owner/two.jpg?token=expired' }]);
        if (url.pathname.endsWith('/album_photos')) {
            return Response.json([{ photos: { ...photo, id:'two', preview_path:'owner/two-preview.jpg' } }]);
        }
        return new Response('second photo', { headers:{'content-type':'image/jpeg'} });
    });
    assert.equal(await response.text(), 'second photo');
    const lookup = calls.find(url=>url.pathname.endsWith('/album_photos'));
    assert.match(lookup.searchParams.get('photos.or'), /owner\/two.jpg/);
    assert.equal(lookup.searchParams.get('album_id'), 'eq.a1');
    assert.equal(lookup.searchParams.get('photos.visibility'), 'eq.public');
    assert.match(calls.at(-1).pathname, /two-preview.jpg$/);
});
test('a private or removed chosen cover falls back to a public album member', async () => {
    let lookups = 0;
    const response = await createShareResponse(request('album/a1?image=1'), ['album','a1'], async input => {
        const url=new URL(input);
        if(url.pathname.endsWith('/albums'))return Response.json([{id:'a1',visibility:'public',cover_url:'https://project.supabase.co/storage/v1/object/sign/photos/owner/removed.jpg'}]);
        if(url.pathname.endsWith('/album_photos')) { lookups++; return Response.json(url.searchParams.has('photos.or') ? [] : [{photos:photo}]); }
        return new Response('fallback', {headers:{'content-type':'image/jpeg'}});
    });
    assert.equal(await response.text(),'fallback');
    assert.equal(lookups,2);
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

test('share thumbnails never download originals or another owners derivative', async () => {
    for (const preview_path of ['another/preview.jpg', 'owner/../private.jpg', null]) {
        let calls = 0;
        const response = await createShareResponse(request('photo/p1?image=1'), ['photo','p1'], async () => {
            calls++; return Response.json([{ ...photo, preview_path, storage_path:'owner/original.jpg' }]);
        });
        assert.equal(response.status,404);
        assert.equal(calls,1);
    }
});
