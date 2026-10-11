import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createAlbumComposeMapController } from '../js/album-compose-map.mjs';

const photos = [
    { id: 'a', lat: 37.58, lng: 126.98 },
    { id: 'b', lat: 35.16, lng: 129.06 }
];

function harness(loadMaps) {
    const createdMaps = [];
    const markers = [];
    const events = [];
    const maps = {
        Map: class {
            constructor(container, options) { this.container = container; this.options = options; this.fits = []; this.center = options.center; this.zoom = options.zoom; createdMaps.push(this); }
            fitBounds(bounds, padding) { this.fits.push({ bounds, padding }); }
            setCenter(center) { this.center = center; }
            setZoom(zoom) { this.zoom = zoom; }
        },
        Marker: class {
            constructor(options) { Object.assign(this, options); markers.push(this); }
            setMap(map) { this.map = map; }
        },
        LatLngBounds: class {
            constructor() { this.points = []; }
            extend(point) { this.points.push(point); }
        },
        event: { trigger: (...args) => events.push(args), clearInstanceListeners: map => events.push(['clear', map]) }
    };
    const controller = createAlbumComposeMapController({ loadMaps: loadMaps || (async () => maps), getMapId: () => 'album-map-id' });
    return { controller, maps, createdMaps, markers, events, container: { isConnected: true } };
}

test('album markers are geographic map markers for every located photo, not fixed screen elements', async () => {
    const h = harness();
    const result = await h.controller.render(h.container, [...photos, { id: 'none', lat: null, lng: null }, { id: 'invalid', lat: 100, lng: 200 }]);
    assert.equal(result, 'ready');
    assert.equal(h.markers.length, 2);
    assert.deepEqual(h.markers.map(marker => marker.position), photos.map(({ lat, lng }) => ({ lat, lng })));
    assert.ok(h.markers.every(marker => marker.map === h.createdMaps[0]));
    assert.equal(h.createdMaps[0].options.mapId, 'album-map-id');
    assert.equal(h.createdMaps[0].options.zoomControl, true);
    assert.deepEqual(h.createdMaps[0].fits[0].bounds.points, photos.map(({ lat, lng }) => ({ lat, lng })));
});

test('reopening and URL-only refreshes preserve the user camera without recreating markers', async () => {
    const h = harness();
    await h.controller.render(h.container, photos);
    const map = h.createdMaps[0];
    map.setCenter({ lat: 36, lng: 128 });
    map.setZoom(16);
    await h.controller.render(h.container, photos.map(photo => ({ ...photo, url: '/refreshed.jpg' })));
    assert.equal(h.createdMaps.length, 1);
    assert.equal(h.markers.length, 2);
    assert.equal(map.fits.length, 1);
    assert.equal(map.zoom, 16);
    assert.deepEqual(map.center, { lat: 36, lng: 128 });
    assert.ok(h.events.some(([instance, event]) => instance === map && event === 'resize'));
});

test('adding, removing, or relocating photos replaces markers and fits the current coordinates', async () => {
    const h = harness();
    await h.controller.render(h.container, photos);
    await h.controller.render(h.container, [{ ...photos[0], lat: 38 }]);
    assert.equal(h.markers[0].map, null);
    assert.equal(h.markers[1].map, null);
    assert.deepEqual(h.markers[2].position, { lat: 38, lng: 126.98 });
    assert.deepEqual(h.createdMaps[0].center, { lat: 38, lng: 126.98 });
    assert.equal(h.createdMaps[0].zoom, 13);
    assert.equal(await h.controller.render(h.container, []), 'empty');
    assert.equal(h.markers[2].map, null);
});

test('a replacement map container releases markers from the old map', async () => {
    const h = harness();
    await h.controller.render(h.container, photos);
    const oldMap = h.createdMaps[0];
    await h.controller.render({ isConnected: true }, photos);
    assert.equal(h.createdMaps.length, 2);
    assert.equal(h.markers[0].map, null);
    assert.equal(h.markers[2].map, h.createdMaps[1]);
    assert.ok(h.events.some(([event, map]) => event === 'clear' && map === oldMap));
});

test('closing, leaving, or removing the page cancels pending map work', async () => {
    for (const action of ['cancel', 'dispose', 'disconnect']) {
        let resolve;
        const h = harness(() => new Promise(done => { resolve = done; }));
        const pending = h.controller.render(h.container, photos);
        if (action === 'disconnect') h.container.isConnected = false;
        else h.controller[action]();
        resolve(h.maps);
        assert.equal(await pending, 'stale');
        assert.equal(h.createdMaps.length, 0);
        assert.equal(h.markers.length, 0);
    }
});

test('failed maps can be retried and never leave orphan markers', async () => {
    let attempt = 0;
    const h = harness(async () => { if (!attempt++) throw new Error('offline'); return h.maps; });
    assert.equal(await h.controller.render(h.container, photos), 'unavailable');
    assert.equal(await h.controller.render(h.container, photos), 'ready');
    h.controller.dispose();
    assert.ok(h.markers.every(marker => marker.map === null));
});

test('album composition lazily opens the interactive map and no longer uses an embedded fixed preview', () => {
    const app = readFileSync('js/app.js', 'utf8');
    const compose = app.slice(app.indexOf('function renderAlbumComposePage'), app.indexOf('function getAlbumPhotoDayGroups'));
    assert.match(compose, /id="album-compose-map-canvas"/);
    assert.doesNotMatch(compose, /<iframe|album-map-frame/);
    assert.match(compose, /addEventListener\('toggle'/);
    assert.match(app, /if \(!section\?\.open \|\| section\.hidden/);
    assert.match(app, /previousRoute === 'album'[\s\S]*albumComposeMapController\.dispose\(\)/);
});
