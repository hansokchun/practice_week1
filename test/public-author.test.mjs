import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getAuthorInitials,
    getPublicAuthorName
} from '../js/public-author.mjs';

test('getPublicAuthorName prefers fetched profile names', () => {
    assert.equal(
        getPublicAuthorName({ owner_id: 'user-1' }, { profileNames: { 'user-1': 'Nari' } }),
        'Nari'
    );
});

test('getPublicAuthorName uses current user metadata for own albums', () => {
    assert.equal(
        getPublicAuthorName(
            { owner_id: 'user-1' },
            { currentUser: { id: 'user-1', email: 'nari@example.com', user_metadata: { nickname: 'Nari Kim' } } }
        ),
        'Nari Kim'
    );
});

test('getPublicAuthorName uses a neutral public fallback for demo albums', () => {
    assert.equal(getPublicAuthorName({ owner_id: 'demo' }, {}), '여행자');
});

test('getAuthorInitials makes compact initials', () => {
    assert.equal(getAuthorInitials('Nari Kim'), 'NK');
    assert.equal(getAuthorInitials('여행자'), '여');
});
