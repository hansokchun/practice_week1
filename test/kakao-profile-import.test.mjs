import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getOAuthIdentityProfile,
    mergeOAuthIdentityProfile,
    setPendingOAuthProvider,
    takePendingOAuthProvider
} from '../js/oauth-profile-import.mjs';

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key)
    };
}

test('pending Kakao login survives the OAuth redirect and is consumed once', () => {
    const storage = createStorage();

    assert.equal(setPendingOAuthProvider(storage, 'kakao'), 'kakao');
    assert.equal(takePendingOAuthProvider(storage), 'kakao');
    assert.equal(takePendingOAuthProvider(storage), null);
});

test('Kakao identity profile is read instead of linked Google metadata', () => {
    const profile = getOAuthIdentityProfile({
        user_metadata: {
            full_name: 'Google Name',
            avatar_url: 'https://google.example.com/avatar.jpg'
        },
        identities: [
            {
                provider: 'google',
                identity_data: {
                    full_name: 'Google Name',
                    avatar_url: 'https://google.example.com/avatar.jpg'
                }
            },
            {
                provider: 'kakao',
                identity_data: {
                    full_name: 'Kakao Name',
                    avatar_url: 'http://kakao.example.com/avatar.jpg'
                }
            }
        ]
    }, 'kakao');

    assert.deepEqual(profile, {
        provider: 'kakao',
        nickname: 'Kakao Name',
        avatarUrl: 'https://kakao.example.com/avatar.jpg'
    });
});

test('applying a Kakao profile preserves the Ikkyee bio and missing provider values', () => {
    assert.deepEqual(
        mergeOAuthIdentityProfile({
            nickname: 'Current Name',
            bio: 'Keep this introduction',
            avatarUrl: 'https://ikkyee.example.com/avatar.jpg'
        }, {
            provider: 'kakao',
            nickname: 'Kakao Name',
            avatarUrl: ''
        }),
        {
            nickname: 'Kakao Name',
            bio: 'Keep this introduction',
            avatarUrl: 'https://ikkyee.example.com/avatar.jpg'
        }
    );
});

test('Kakao login return offers a profile preview and explicit choices', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="kakao-profile-import-modal"/);
    assert.match(html, /카카오 프로필을 적용할까요\?/);
    assert.match(html, /id="btn-apply-kakao-profile"/);
    assert.match(html, /id="btn-keep-ikkyee-profile"/);
    assert.match(app, /setPendingOAuthProvider\(window\.sessionStorage,\s*provider\)/);
    assert.match(app, /takePendingOAuthProvider\(window\.sessionStorage\)/);
    assert.match(app, /getOAuthIdentityProfile\(state\.currentUser,\s*'kakao'\)/);
    assert.match(app, /\$\('#btn-apply-kakao-profile'\)\?\.addEventListener\('click',\s*applyPendingKakaoProfile\)/);
});
