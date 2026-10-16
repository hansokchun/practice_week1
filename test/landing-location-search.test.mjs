import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    LANDING_SEARCH_PAGE_SIZE,
    getLandingLocationBounds,
    getLandingLocationPhotos,
    getLandingSearchPage,
    isPublicLandingSearchPhoto,
    normalizeLandingLocationQuery,
    resolveLandingLocation
} from '../js/landing-location-search.mjs';

test('landing location queries are compact, bounded, and do not search an empty value', async () => {
    assert.equal(normalizeLandingLocationQuery('  서울\n\t특별시   종로구  '), '서울 특별시 종로구');
    assert.equal(normalizeLandingLocationQuery('x'.repeat(101)), 'x'.repeat(100));

    let loadCalls = 0;
    const result = await resolveLandingLocation('   ', {
        loadMaps: async () => {
            loadCalls += 1;
            return {};
        }
    });

    assert.equal(result, null);
    assert.equal(loadCalls, 0);
});

test('landing location search only admits explicitly public photos and legacy shared photos without visibility', () => {
    assert.equal(isPublicLandingSearchPhoto({ visibility: 'public' }), true);
    assert.equal(isPublicLandingSearchPhoto({ shared: true }), true);
    assert.equal(isPublicLandingSearchPhoto({ shared: true, visibility: 'private' }), false);
    assert.equal(isPublicLandingSearchPhoto({ shared: true, visibility: 'link' }), false);
    assert.equal(isPublicLandingSearchPhoto({ shared: true, visibility: null }), false);
    assert.equal(isPublicLandingSearchPhoto({ shared: false }), false);
});

test('landing location bounds prefer valid result bounds and accept Maps toJSON output', () => {
    const bounds = getLandingLocationBounds({
        geometry: {
            bounds: {
                toJSON: () => ({ north: 38, south: 37, east: 128, west: 126 })
            },
            viewport: {
                toJSON: () => ({ north: 39, south: 36, east: 129, west: 125 })
            }
        }
    });

    assert.deepEqual(bounds, { north: 38, south: 37, east: 128, west: 126 });
});

test('landing location bounds fall back from invalid bounds to a viewport with LatLng accessors', () => {
    const northEast = {
        latitude: 38,
        longitude: 128,
        lat() { return this.latitude; },
        lng() { return this.longitude; }
    };
    const southWest = {
        latitude: 37,
        longitude: 126,
        lat() { return this.latitude; },
        lng() { return this.longitude; }
    };
    const bounds = getLandingLocationBounds({
        geometry: {
            bounds: { north: 'bad' },
            viewport: {
                getNorthEast: () => northEast,
                getSouthWest: () => southWest
            }
        }
    });

    assert.deepEqual(bounds, { north: 38, south: 37, east: 128, west: 126 });
    assert.equal(getLandingLocationBounds({ geometry: { viewport: { north: 100, south: 37, east: 128, west: 126 } } }), null);
});

test('landing location photos keep public points inside bounds including zero coordinates without mutating the input', () => {
    const photos = [
        { id: 'public-inside', visibility: 'public', lat: 37.5, lng: 127 },
        { id: 'numeric-string', visibility: 'public', lat: '37.5', lng: '127' },
        { id: 'legacy-zero', shared: true, lat: 0, lng: 0 },
        { id: 'private', shared: true, visibility: 'private', lat: 37.5, lng: 127 },
        { id: 'blank', visibility: 'public', lat: '', lng: 127 },
        { id: 'boolean-false', visibility: 'public', lat: false, lng: 127 },
        { id: 'boolean-true', visibility: 'public', lat: true, lng: 127 },
        { id: 'object-value', visibility: 'public', lat: {}, lng: 127 },
        { id: 'invalid', visibility: 'public', lat: 91, lng: 127 },
        { id: 'outside', visibility: 'public', lat: 38.1, lng: 127 }
    ];
    const snapshot = structuredClone(photos);

    const matching = getLandingLocationPhotos(photos, { north: 38, south: 0, east: 128, west: 0 });

    assert.deepEqual(matching.map((photo) => photo.id), ['public-inside', 'numeric-string', 'legacy-zero']);
    assert.deepEqual(photos, snapshot);
});

test('landing location photos search a longitude range that crosses the date line', () => {
    const matching = getLandingLocationPhotos([
        { id: 'east-side', visibility: 'public', lat: 10, lng: 175 },
        { id: 'west-side', visibility: 'public', lat: 10, lng: -175 },
        { id: 'middle', visibility: 'public', lat: 10, lng: 0 }
    ], { north: 20, south: 0, west: 170, east: -170 });

    assert.deepEqual(matching.map((photo) => photo.id), ['east-side', 'west-side']);
});

test('landing location results paginate fixed twenty-four-photo pages and clamp the requested page', () => {
    const photos = Array.from({ length: 49 }, (_, index) => ({ id: index + 1 }));
    const lastPage = getLandingSearchPage(photos, 99);
    const firstPage = getLandingSearchPage(photos, -10);

    assert.equal(LANDING_SEARCH_PAGE_SIZE, 24);
    assert.deepEqual(lastPage, {
        items: [{ id: 49 }], page: 3, pageCount: 3, total: 49, hasPrevious: true, hasNext: false
    });
    assert.deepEqual(firstPage.items, photos.slice(0, 24));
    assert.equal(firstPage.page, 1);
    assert.deepEqual(getLandingSearchPage([], 4), {
        items: [], page: 1, pageCount: 1, total: 0, hasPrevious: false, hasNext: false
    });
});

test('landing location resolve calls the Google geocoder once and uses its formatted label and bounds', async () => {
    let loadCalls = 0;
    let geocodeCalls = 0;
    const result = await resolveLandingLocation('  부산  ', {
        loadMaps: async () => {
            loadCalls += 1;
            return {
                Geocoder: class {
                    geocode(request, callback) {
                        geocodeCalls += 1;
                        assert.deepEqual(request, { address: '부산' });
                        callback([{ formatted_address: '부산광역시, 대한민국', geometry: { bounds: { north: 36, south: 35, east: 130, west: 128 } } }], 'OK');
                    }
                }
            };
        }
    });

    assert.equal(loadCalls, 1);
    assert.equal(geocodeCalls, 1);
    assert.deepEqual(result, {
        label: '부산광역시, 대한민국', bounds: { north: 36, south: 35, east: 130, west: 128 }
    });
});

test('landing location resolve returns null for no matching location', async () => {
    const result = await resolveLandingLocation('없는 지명', {
        loadMaps: async () => ({
            Geocoder: class {
                geocode(_request, callback) {
                    callback([], 'ZERO_RESULTS');
                }
            }
        })
    });

    assert.equal(result, null);
});

test('landing location resolve exposes stable errors for denied APIs, failed loads, invalid geometry, and timeout', async () => {
    await assert.rejects(
        resolveLandingLocation('서울', { loadMaps: async () => { throw new Error('offline'); } }),
        (error) => error?.code === 'MAPS_LOAD_FAILED'
    );
    await assert.rejects(
        resolveLandingLocation('서울', {
            loadMaps: async () => ({ Geocoder: class { geocode(_request, callback) { callback([], 'REQUEST_DENIED'); } } })
        }),
        (error) => error?.code === 'GEOCODE_REQUEST_DENIED'
    );
    await assert.rejects(
        resolveLandingLocation('서울', {
            loadMaps: async () => ({ Geocoder: class { geocode(_request, callback) { callback([], 'OVER_QUERY_LIMIT'); } } })
        }),
        (error) => error?.code === 'GEOCODE_OVER_QUERY_LIMIT'
    );
    await assert.rejects(
        resolveLandingLocation('서울', {
            loadMaps: async () => ({ Geocoder: class { geocode(_request, callback) { callback([{ geometry: {} }], 'OK'); } } })
        }),
        (error) => error?.code === 'GEOCODE_INVALID_GEOMETRY'
    );
    await assert.rejects(
        resolveLandingLocation('서울', {
            timeoutMs: 5,
            loadMaps: async () => ({ Geocoder: class { geocode() {} } })
        }),
        (error) => error?.code === 'LOCATION_SEARCH_TIMEOUT'
    );
});

test('landing location resolve ignores a geocoder callback that arrives after its timeout', async () => {
    let geocodeCalls = 0;
    let callback;
    const search = resolveLandingLocation('서울', {
        timeoutMs: 5,
        loadMaps: async () => ({
            Geocoder: class {
                geocode(_request, onResult) {
                    geocodeCalls += 1;
                    callback = onResult;
                }
            }
        })
    });

    await assert.rejects(search, (error) => error?.code === 'LOCATION_SEARCH_TIMEOUT');
    callback([{ formatted_address: '서울특별시', geometry: { bounds: { north: 38, south: 37, east: 128, west: 126 } } }], 'OK');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(geocodeCalls, 1);
});
