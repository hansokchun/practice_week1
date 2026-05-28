import test from 'node:test';
import assert from 'node:assert/strict';

import { getVisibilityShortcutAction } from '../js/visibility-shortcut.mjs';

test('getVisibilityShortcutAction saves settings for supported visibility shortcuts', () => {
    assert.deepEqual(getVisibilityShortcutAction('link'), {
        visibility: 'link',
        shouldSave: true
    });
    assert.deepEqual(getVisibilityShortcutAction('private'), {
        visibility: 'private',
        shouldSave: true
    });
});

test('getVisibilityShortcutAction ignores unsupported shortcut values', () => {
    assert.deepEqual(getVisibilityShortcutAction('unknown'), {
        visibility: 'private',
        shouldSave: false
    });
});
