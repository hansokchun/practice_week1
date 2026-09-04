import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    DEFAULT_ACCOUNT_SETTINGS,
    getUploadVisibilityPlan,
    getAccountSettingsStorageKey,
    loadAccountSettings,
    normalizeAccountSettings,
    saveAccountSettings
} from '../js/account-settings.mjs';

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        }
    };
}

test('account settings keep privacy-conscious defaults and reject unsupported values', () => {
    assert.deepEqual(DEFAULT_ACCOUNT_SETTINGS, {
        defaultVisibility: 'private',
        missingLocationNotifications: true,
        librarySummaryNotifications: true
    });
    assert.deepEqual(normalizeAccountSettings({
        defaultVisibility: 'friends',
        missingLocationNotifications: false,
        librarySummaryNotifications: 'yes'
    }), {
        defaultVisibility: 'private',
        missingLocationNotifications: false,
        librarySummaryNotifications: true
    });
});

test('account settings are stored separately for each signed-in account', () => {
    const storage = createStorage();
    const saved = saveAccountSettings(storage, 'user-1', {
        defaultVisibility: 'public',
        missingLocationNotifications: false,
        librarySummaryNotifications: true
    });

    assert.equal(getAccountSettingsStorageKey('user-1'), 'ikkyee:s:user-1');
    assert.equal(saved.defaultVisibility, 'public');
    assert.deepEqual(loadAccountSettings(storage, 'user-1'), saved);
    assert.deepEqual(loadAccountSettings(storage, 'user-2'), DEFAULT_ACCOUNT_SETTINGS);
});

test('new photo visibility plan follows the account default and respects a public allowance', () => {
    assert.deepEqual(getUploadVisibilityPlan({
        defaultVisibility: 'private',
        photoCount: 3
    }), ['private', 'private', 'private']);
    assert.deepEqual(getUploadVisibilityPlan({
        defaultVisibility: 'public',
        photoCount: 3
    }), ['public', 'public', 'public']);
    assert.deepEqual(getUploadVisibilityPlan({
        defaultVisibility: 'public',
        photoCount: 3,
        publicAllowance: 1
    }), ['public', 'private', 'private']);
});

test('profile menu and settings route expose the complete account settings surface', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /data-account-route="settings"[^>]*>[\s\S]*settings[\s\S]*설정<\/button>/u);
    assert.match(html, /id="page-settings"/u);
    assert.match(html, /id="settings-profile-edit"/u);
    assert.match(html, /data-settings-visibility="private"/u);
    assert.match(html, /data-settings-visibility="public"/u);
    assert.match(html, /새 사진 자동 공개/u);
    assert.match(html, />자동 공개<\/button>/u);
    assert.match(html, /id="settings-missing-location-notifications"/u);
    assert.match(html, /id="settings-library-summary-notifications"/u);
    assert.match(html, /id="settings-feedback-open"/u);
    assert.match(html, /id="settings-logout"/u);
    assert.match(html, /id="settings-delete-account"/u);
    assert.match(app, /'settings'/u);
    assert.match(app, /function renderAccountSettingsPage\(\)/u);
    assert.match(app, /getUploadVisibilityPlan\(\{/u);
    assert.match(app, /새 사진을 자동 공개합니다\./u);
    assert.match(app, /getAuthRequiredRoute\(normalized, state\.currentUser\)[\s\S]*routeTo\(normalized, options\)/u);
    assert.match(css, /\.settings-page-shell\s*\{/u);
    assert.match(css, /\.settings-toggle\s*\{/u);
});
