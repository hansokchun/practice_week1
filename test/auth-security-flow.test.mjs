import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync('js/app.js', 'utf8');
const authSource = readFileSync('auth.js', 'utf8');
const html = readFileSync('index.html', 'utf8');

test('email auth calls pass Supabase CAPTCHA tokens when available', () => {
    assert.match(authSource, /export async function signUpWithEmail\(email, password, options = \{\}\)/);
    assert.match(authSource, /sb\.auth\.signUp\(\{\s*email,\s*password,\s*options:\s*getAuthOptions\(options\)/s);
    assert.match(authSource, /export async function signInWithEmail\(email, password, options = \{\}\)/);
    assert.match(authSource, /sb\.auth\.signInWithPassword\(\{\s*email,\s*password,\s*options:\s*getAuthOptions\(options\)/s);
    assert.match(authSource, /export async function resetPasswordForEmail\(email, options = \{\}\)/);
    assert.match(authSource, /sb\.auth\.resetPasswordForEmail\(email,\s*getAuthOptions\(options\)\)/s);
});

test('auth modal exposes Google first, email signup, password reset, and Turnstile mount', () => {
    assert.match(html, /id="btn-google-login"/);
    assert.match(html, /id="btn-login"/);
    assert.match(html, /id="btn-signup"/);
    assert.match(html, /id="btn-reset-password"/);
    assert.match(html, /id="turnstile-container"/);
    assert.match(html, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
});

test('email signup waits for verification instead of opening the app as a logged-in user', () => {
    const start = appSource.indexOf('async function handleSignup');
    const end = appSource.indexOf('async function handlePasswordReset', start);
    const body = appSource.slice(start, end);

    assert.match(body, /await signUpWithEmail\(email, password, \{\s*captchaToken:\s*getTurnstileToken\(\)\s*\}\)/s);
    assert.doesNotMatch(body, /state\.currentUser\s*=\s*user/);
    assert.match(body, /const verificationMessage = '\\uC774\\uBA54\\uC77C \\uC778\\uC99D \\uB9C1\\uD06C\\uB97C/);
    assert.match(body, /showToast\(verificationMessage\)/);
    assert.match(body, /resetTurnstile\(\)/);
});

test('upload and publish actions require a verified email account', () => {
    assert.match(appSource, /function isCurrentUserEmailVerified\(\)/);
    assert.match(appSource, /function enforceVerifiedAccount\(action\)/);

    const uploadStart = appSource.indexOf('async function persistStagedPhotos()');
    const uploadEnd = appSource.indexOf('function safeFileName', uploadStart + 1);
    const uploadBody = appSource.slice(uploadStart, appSource.indexOf('if (!enforceNewAccountLimit', uploadStart));
    assert.match(uploadBody, /if \(!enforceVerifiedAccount\('upload'\)\) return;/);

    const shareStart = appSource.indexOf('async function saveShareSettings()');
    const shareBody = appSource.slice(shareStart, appSource.indexOf('if (!enforceNewAccountLimit', shareStart));
    assert.match(shareBody, /if \(!enforceVerifiedAccount\('publish'\)\) return;/);

    const albumStart = appSource.indexOf('async function toggleSelectedAlbumVisibility()');
    const albumBody = appSource.slice(albumStart, appSource.indexOf('if (!enforceNewAccountLimit', albumStart));
    assert.match(albumBody, /if \(!enforceVerifiedAccount\('publish'\)\) return;/);
});
