import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');
const styles = readFileSync('style.css', 'utf8');

test('Explore no longer binds legacy static photo pin clicks', () => {
    assert.doesNotMatch(source, /data-explore-photo-pin/);
    assert.doesNotMatch(source, /explorePhotoPin/);
});

test('Explore no longer ships legacy static photo pin CSS', () => {
    assert.doesNotMatch(styles, /\.explore-photo-pin/);
    assert.doesNotMatch(styles, /\.explore-photo-pins/);
});
