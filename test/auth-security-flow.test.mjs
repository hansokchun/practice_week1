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

test('auth modal exposes social choices first, email signup, password reset, and Turnstile mount', () => {
    assert.match(html, /id="btn-google-login"/);
    assert.match(html, /id="btn-kakao-login"/);
    assert.match(html, /id="btn-email-start"/);
    assert.match(html, /id="btn-signup"/);
    assert.match(html, /id="btn-switch-login"/);
    assert.match(html, /id="btn-email-submit"/);
    assert.match(html, /id="btn-reset-password"/);
    assert.match(html, /id="auth-form" class="auth-form" hidden/);
    assert.match(html, /id="turnstile-container"/);
    assert.match(html, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
    assert.doesNotMatch(html, /auth-divider/);
    assert.doesNotMatch(html, /id="btn-login"/);
});

test('email start choice reveals the email form while auth modal opens collapsed', () => {
    assert.match(appSource, /function resetAuthModal\(\)/);
    assert.match(appSource, /function showEmailAuthForm\(\)/);
    assert.match(appSource, /function setAuthMode\(mode\)/);
    assert.match(appSource, /if \(id === '#auth-modal'\) resetAuthModal\(\);/);
    assert.match(appSource, /#btn-email-start'\)\?\.addEventListener\('click', showEmailAuthForm\)/);
    assert.match(appSource, /#btn-signup'\)\?\.addEventListener\('click', \(\) => setAuthMode\('signup'\)\)/);
    assert.match(appSource, /#btn-switch-login'\)\?\.addEventListener\('click', \(\) => setAuthMode\('login'\)\)/);
});

test('email form submit logs in or signs up based on the selected auth mode', () => {
    const start = appSource.indexOf('async function handleAuthSubmit');
    const end = appSource.indexOf('async function handleSignup', start);
    const body = appSource.slice(start, end);

    assert.match(body, /if \(state\.authMode === 'signup'\) \{\s*await handleSignup\(\);\s*return;\s*\}/s);
    assert.match(body, /await signInWithEmail\(email, password, \{/s);
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
