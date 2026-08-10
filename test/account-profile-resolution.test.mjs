import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getProviderAccountProfile,
    resolveAccountProfile
} from '../js/account-profile.mjs';

test('stored Ikkyee profile stays identical across Google and Kakao logins', () => {
    const storedProfile = {
        id: 'shared-user',
        nickname: 'Ikkyee Traveler',
        bio: 'Shared account profile',
        avatar_url: 'https://cdn.example.com/ikkyee-profile.jpg'
    };
    const googleUser = {
        id: 'shared-user',
        email: 'traveler@example.com',
        user_metadata: {
            full_name: 'Google Name',
            avatar_url: 'https://google.example.com/avatar.jpg'
        }
    };
    const kakaoUser = {
        id: 'shared-user',
        email: 'traveler@example.com',
        user_metadata: {
            name: 'Kakao Name',
            avatar_url: 'http://kakao.example.com/avatar.jpg'
        }
    };

    assert.deepEqual(
        resolveAccountProfile(googleUser, storedProfile),
        resolveAccountProfile(kakaoUser, storedProfile)
    );
});

test('new provider accounts keep the avatar empty until the user chooses one', () => {
    const profile = getProviderAccountProfile({
        email: 'traveler@example.com',
        user_metadata: {
            name: 'Kakao Name',
            avatar_url: 'http://kakao.example.com/avatar.jpg'
        }
    });

    assert.deepEqual(profile, {
        nickname: 'Kakao Name',
        bio: '',
        avatarUrl: ''
    });
});

test('an intentionally empty stored avatar does not fall back to the OAuth provider', () => {
    const profile = resolveAccountProfile({
        email: 'traveler@example.com',
        user_metadata: {
            name: 'Provider Name',
            avatar_url: 'https://provider.example.com/avatar.jpg'
        }
    }, {
        id: 'shared-user',
        nickname: 'Saved Name',
        bio: '',
        avatar_url: ''
    });

    assert.equal(profile.avatarUrl, '');
    assert.equal(profile.nickname, 'Saved Name');
});

test('app loads the stored profile before rendering the account header', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const bootStart = source.indexOf("document.addEventListener('DOMContentLoaded'");
    const bootBody = source.slice(bootStart);

    assert.match(source, /resolveAccountProfile\(user,\s*storedProfile\)/);
    assert.ok(bootBody.indexOf('await ensureCurrentUserPublicProfile();') < bootBody.indexOf('updateAccountUI();'));
});
