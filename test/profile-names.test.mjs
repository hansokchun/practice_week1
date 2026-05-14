import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createProfileNameResolver,
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

