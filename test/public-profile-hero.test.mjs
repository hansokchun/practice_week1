import test from 'node:test';
import assert from 'node:assert/strict';

import { getProfileHeroImage } from '../js/public-profile-hero.mjs';

test('getProfileHeroImage prefers selected album cover', () => {
    assert.equal(getProfileHeroImage({ cover_url: 'cover.jpg' }, []), 'cover.jpg');
});

test('getProfileHeroImage falls back to first profile album cover', () => {
    assert.equal(getProfileHeroImage({}, [{ cover_url: 'album.jpg' }]), 'album.jpg');
});

test('getProfileHeroImage uses the provided default image when no cover exists', () => {
    assert.equal(getProfileHeroImage({}, [], 'fallback.jpg'), 'fallback.jpg');
});
