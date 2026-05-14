import test from 'node:test';
import assert from 'node:assert/strict';

import { saveNicknameProfile } from '../auth.js';

function createProfilesClient({ updateResult, insertResult = { error: null } }) {
    const calls = [];
    const profilesTable = {
        update(payload) {
            calls.push(['update', payload]);
            return {
                eq(column, value) {
                    calls.push(['eq', column, value]);
                    return {
                        select(columns) {
                            calls.push(['select', columns]);
                            return {
                                async maybeSingle() {
                                    calls.push(['maybeSingle']);
                                    return updateResult;
                                }
                            };
                        }
                    };
                }
            };
        },
        async insert(payload) {
            calls.push(['insert', payload]);
            return insertResult;
        }
    };

    return {
        calls,
        client: {
            from(tableName) {
                assert.equal(tableName, 'profiles');
                return profilesTable;
            }
        }
    };
}

test('saveNicknameProfile updates an existing profile row without upsert', async () => {
    const { client, calls } = createProfilesClient({
        updateResult: { data: { id: 'user-1' }, error: null }
    });

    const result = await saveNicknameProfile(client, 'user-1', 'Mina');

    assert.equal(result.error, null);
    assert.deepEqual(calls, [
        ['update', { nickname: 'Mina' }],
        ['eq', 'id', 'user-1'],
        ['select', 'id'],
        ['maybeSingle']
    ]);
});

test('saveNicknameProfile inserts when no profile row exists', async () => {
    const { client, calls } = createProfilesClient({
        updateResult: { data: null, error: null }
    });

    const result = await saveNicknameProfile(client, 'user-2', 'Nari');

    assert.equal(result.error, null);
    assert.deepEqual(calls.at(-1), ['insert', { id: 'user-2', nickname: 'Nari' }]);
});

test('saveNicknameProfile reports duplicate nickname errors', async () => {
    const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const { client } = createProfilesClient({
        updateResult: { data: null, error: duplicateError }
    });

    const result = await saveNicknameProfile(client, 'user-3', 'Taken');

    assert.equal(result.error, duplicateError);
});

