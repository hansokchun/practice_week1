import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mountGoogleMapsPlaceAutocomplete } from '../js/google-maps-place-autocomplete.mjs';

class PlaceAutocompleteElement {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(name, handler) {
        this.listeners.set(name, handler);
    }
}

test('new place autocomplete replaces the legacy input and moves the map after selection', async () => {
    let replacement = null;
    const input = {
        id: 'explore-map-search-input',
        placeholder: '장소 검색',
        replaceWith(element) {
            replacement = element;
        }
    };
    const map = {
        center: null,
        zoom: null,
        panTo(position) {
            this.center = position;
        },
        setZoom(zoom) {
            this.zoom = zoom;
        }
    };
    const place = {
        location: { lat: 37.5, lng: 127 },
        async fetchFields({ fields }) {
            assert.deepEqual(fields, ['location']);
        }
    };

    const element = mountGoogleMapsPlaceAutocomplete({
        maps: { places: { PlaceAutocompleteElement } },
        map,
        input
    });
    await element.listeners.get('gmp-select')({
        placePrediction: { toPlace: () => place }
    });

    assert.equal(replacement, element);
    assert.equal(element.id, 'explore-map-search-input');
    assert.equal(element.placeholder, '장소 검색');
    assert.deepEqual(map.center, place.location);
    assert.equal(map.zoom, 13);
});

test('new place autocomplete reports selection failures without throwing', async () => {
    const failures = [];
    const input = { replaceWith() {} };
    const element = mountGoogleMapsPlaceAutocomplete({
        maps: { places: { PlaceAutocompleteElement } },
        map: {},
        input,
        onError: (error) => failures.push(error)
    });

    await element.listeners.get('gmp-select')({ placePrediction: null });
    assert.equal(failures.length, 1);
});

test('new place autocomplete stays unavailable when the constructor is missing', () => {
    assert.equal(mountGoogleMapsPlaceAutocomplete({ maps: {}, map: {}, input: {} }), null);
});
