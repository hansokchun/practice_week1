import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    formatStreetViewDistance,
    getCoordinateDistanceMeters,
    LOCATION_ASSIGNMENT_STREET_VIEW_RADII
} from '../js/location-assignment-street-view.mjs';

test('location assignment checks a close panorama before a wider fallback', () => {
    assert.deepEqual(LOCATION_ASSIGNMENT_STREET_VIEW_RADII, [50, 200]);
});

test('street view distance measures the panorama without changing the selected pin', () => {
    const distance = getCoordinateDistanceMeters(
        { lat: 37.579617, lng: 126.977041 },
        { lat: 37.580517, lng: 126.977041 }
    );

    assert.ok(distance > 99 && distance < 102);
    assert.equal(getCoordinateDistanceMeters({ lat: 37, lng: 127 }, { lat: Number.NaN, lng: 127 }), null);
    assert.equal(getCoordinateDistanceMeters({ lat: 37, lng: 127 }, { lat: null, lng: 127 }), null);
});

test('street view distance copy stays concise', () => {
    assert.equal(formatStreetViewDistance(4), '선택한 위치 바로 근처의 거리뷰입니다.');
    assert.equal(formatStreetViewDistance(86), '선택한 위치에서 약 90m 떨어진 거리뷰입니다.');
    assert.equal(formatStreetViewDistance(null), '선택한 위치에서 가장 가까운 거리뷰입니다.');
});
