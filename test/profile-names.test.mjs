import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createProfileNameResolver,
    getProfileDisplayName,
    getProfileUserId,
    getUserFallbackName,
    normalizeNickname
} from '../js/profile-names.mjs';

test('normalizeNickname requires a non-empty nickname', () => {
    assert.equal(normalizeNickname('  Alice  '), 'Alice');
    assert.throws(() => normalizeNickname('   '), /required/);
    assert.throws(() => normalizeNickname(null), /required/);
});

test('getUserFallbackName creates a stable safe label', () => {
    assert.equal(getUserFallbackName('user-123456'), 'User user');
    assert.equal(getUserFallbackName(''), 'User');
});

test('profile helpers support alternate user id and display name fields', () => {
    assert.equal(getProfileUserId({ user_id: 'owner-1' }), 'owner-1');
    assert.equal(getProfileUserId({ owner_id: 'owner-2' }), 'owner-2');
    assert.equal(getProfileDisplayName({ display_name: '  Sora  ' }), 'Sora');
    assert.equal(getProfileDisplayName({ full_name: 'Min Lee' }), 'Min Lee');
    assert.equal(getProfileDisplayName({ email: 'traveler@example.com' }), 'traveler');
});

test('profile resolver uses fetched nickname then cache', async () => {
    let fetchCount = 0;
    const resolver = createProfileNameResolver({
        fetchProfilesByIds: async (ids) => {
            fetchCount += 1;
            assert.deepEqual(ids, ['user-123456']);
            return [{ id: 'user-123456', nickname: 'Nari' }];
        }
    });

    assert.equal(await resolver.resolve('user-123456'), 'Nari');
    assert.equal(await resolver.resolve('user-123456'), 'Nari');
    assert.equal(fetchCount, 1);
});

test('profile resolver matches fetched rows by user_id', async () => {
    const resolver = createProfileNameResolver({
        fetchProfilesByIds: async (ids) => {
            assert.deepEqual(ids, ['owner-123456']);
            return [{ user_id: 'owner-123456', display_name: 'Hana' }];
        }
    });

    assert.equal(await resolver.resolve('owner-123456'), 'Hana');
});

test('profile resolver falls back when profile is missing', async () => {
    const resolver = createProfileNameResolver({
        fetchProfilesByIds: async () => []
    });

    assert.equal(await resolver.resolve('missing-user'), 'User miss');
});

test('profile resolver can prime a saved nickname', async () => {
    const resolver = createProfileNameResolver({
        fetchProfilesByIds: async () => {
            throw new Error('should not fetch primed user');
        }
    });

    resolver.prime('user-123456', 'Mina');
    assert.equal(await resolver.resolve('user-123456'), 'Mina');
});
