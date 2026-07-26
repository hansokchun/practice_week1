import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = () => readFileSync('js/app.js', 'utf8');
const qaRecord = () => readFileSync('docs/qa/authentication-preview-qa-2026-07-26.md', 'utf8');
const checklist = () => readFileSync('docs/product/public-beta-launch-checklist-2026-07-22.md', 'utf8');

test('email signup and reset use the normalized authentication redirect', () => {
    const source = appSource();

    assert.match(source, /import \{ getOAuthRedirectUrl \} from '\.\/oauth-redirect-url\.mjs';/);
    assert.match(
        source,
        /signUpWithEmail\(email, password, \{\s*captchaToken: getTurnstileToken\(\),\s*redirectTo: getOAuthRedirectUrl\(window\.location\)\s*\}\)/s
    );
    assert.match(
        source,
        /resetPasswordForEmail\(email, \{\s*captchaToken: getTurnstileToken\(\),\s*redirectTo: getOAuthRedirectUrl\(window\.location\)\s*\}\)/s
    );
});

test('authentication QA record distinguishes browser checks from real-device completion', () => {
    const source = qaRecord();

    assert.match(source, /Chrome desktop browser session/i);
    assert.match(source, /390 x 844 responsive viewport/i);
    assert.match(source, /not a physical iOS or Android device/i);
    assert.match(source, /accounts\.google\.com/);
    assert.match(source, /accounts\.kakao\.com/);
});

test('authentication QA records the remaining external and dashboard blockers', () => {
    const source = qaRecord();

    assert.match(source, /Site URL.*localhost:3000/i);
    assert.match(source, /email receipt and confirmation link/i);
    assert.match(source, /password-reset email and recovery link/i);
    assert.match(source, /final Google and Kakao consent/i);
    assert.match(source, /Kakao.*account_email/i);
});

test('real-device authentication launch gate remains open', () => {
    assert.match(
        checklist(),
        /- \[ \] Run real-device authentication QA: email verification, reset, Google OAuth, Kakao OAuth, logout, and redirect behavior\./
    );
});
