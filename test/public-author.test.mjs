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

test('getPublicAuthorName keeps demo albums branded', () => {
    assert.equal(getPublicAuthorName({ owner_id: 'demo' }, {}), 'Ikkyee');
});

test('getAuthorInitials makes compact initials', () => {
    assert.equal(getAuthorInitials('Nari Kim'), 'NK');
    assert.equal(getAuthorInitials('Ikkyee'), 'IK');
});
