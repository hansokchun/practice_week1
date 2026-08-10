import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('Explore uses new Places Autocomplete when Map ID is configured and preserves the fallback', () => {
    assert.match(source, /loading=async/);
    assert.match(source, /state\.googleMapsMapId[\s\S]*mountGoogleMapsPlaceAutocomplete/);
    assert.match(source, /uses-place-autocomplete/);
    assert.match(source, /new maps\.places\.Autocomplete\(input, \{ fields: \['geometry', 'name'\] \}\)/);
    assert.match(source, /state\.exploreAutocomplete\.addListener\('place_changed'/);
    assert.doesNotMatch(source, /SearchBox/);
});
