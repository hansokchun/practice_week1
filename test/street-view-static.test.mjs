import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getStreetViewStaticImageUrl } from '../js/street-view-static.mjs';

test('정적 거리뷰 URL은 정확한 위치와 비용이 고정된 이미지 크기를 사용한다', () => {
    const url = new URL(getStreetViewStaticImageUrl({
        lat: 37.5665,
        lng: 126.978,
        apiKey: 'public-browser-key'
    }));

    assert.equal(url.origin, 'https://maps.googleapis.com');
    assert.equal(url.pathname, '/maps/api/streetview');
    assert.equal(url.searchParams.get('location'), '37.5665,126.978');
    assert.equal(url.searchParams.get('size'), '640x360');
    assert.equal(url.searchParams.get('scale'), '2');
    assert.equal(url.searchParams.get('radius'), '80');
    assert.equal(url.searchParams.get('source'), 'outdoor');
    assert.equal(url.searchParams.get('return_error_code'), 'true');
    assert.equal(url.searchParams.get('key'), 'public-browser-key');
});

test('정적 거리뷰 URL은 키나 좌표가 없으면 생성하지 않는다', () => {
    assert.equal(getStreetViewStaticImageUrl({ lat: 37, lng: 127, apiKey: '' }), '');
    assert.equal(getStreetViewStaticImageUrl({ lat: Number.NaN, lng: 127, apiKey: 'key' }), '');
    assert.equal(getStreetViewStaticImageUrl({ lat: 37, lng: Number.POSITIVE_INFINITY, apiKey: 'key' }), '');
});
