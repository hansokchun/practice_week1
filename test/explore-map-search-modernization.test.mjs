import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('Explore uses asynchronous Places Autocomplete instead of deprecated SearchBox', () => {
    assert.match(source, /loading=async/);
    assert.match(source, /new maps\.places\.Autocomplete\(input, \{ fields: \['geometry', 'name'\] \}\)/);
    assert.match(source, /state\.exploreAutocomplete\.addListener\('place_changed'/);
    assert.doesNotMatch(source, /SearchBox/);
});
