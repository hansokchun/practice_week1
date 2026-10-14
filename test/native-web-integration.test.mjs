import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('native Supabase uses persistent encrypted PKCE storage while browser auth keeps existing defaults', () => {
    const source = readFileSync('auth.js', 'utf8');
    assert.match(source, /isNativeApp\(\)/);
    assert.match(source, /flowType: 'pkce'/);
    assert.match(source, /detectSessionInUrl: false/);
    assert.match(source, /storage: createNativeAuthStorage\(\)/);
    assert.match(source, /persistSession: true/);
    assert.match(source, /authorizeNativeOAuth\(sb\.auth, provider/);
});

test('shared web page initializes native callbacks, keeps cloud library and calls HTTPS backend adapter', () => {
    const source = readFileSync('js/app.js', 'utf8');
    assert.match(source, /initializeNativeAuth/);
    assert.match(source, /bindNativeAppRuntime/);
    assert.match(source, /fetchApi\('\/api\/config'/);
    assert.match(readFileSync('auth.js', 'utf8'), /fetchApi\('\/api\/analyze-photo'/);
    assert.match(source, /!isNativeApp\(\).*isLikelyEmbeddedOAuthBrowser/);
});

test('native share links keep the public HTTPS web origin rather than localhost', () => {
    const source = readFileSync('js/app.js', 'utf8');
    assert.match(source, /buildContentShare\(getContentShareOrigin\(\)/);
});

test('native content uses the OS share sheet while browser Kakao sharing remains available', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const html = readFileSync('index.html', 'utf8');
    assert.match(html, /id="btn-share-native"[^>]*hidden/);
    assert.match(source, /nativeButton\.hidden = !native/);
    assert.match(source, /kakaoButton\.hidden = native/);
    assert.match(source, /if \(!native\) prepareContentShareKakao\(content\)/);
    assert.match(source, /shareNativeContent\(content\)/);
    assert.match(source, /btn-share-native'\)\?\.addEventListener\('click', shareContentToNative\)/);
    assert.match(readFileSync('style.css', 'utf8'), /\.content-share-actions button\[hidden\]/);
});

test('native download hands the prepared photo to the OS without claiming gallery save', () => {
    const source = readFileSync('js/app.js', 'utf8');
    assert.match(source, /await saveNativePhoto\(blob, fileName\)/);
    assert.match(source, /await triggerPhotoDownload\(downloadBlob, plan\.fileName\)/);
    assert.match(source, /result\.data\?\.status === 'cancelled'/);
    assert.match(source, /사진 저장·공유창을 열었습니다/);
    assert.match(source, /URL\.createObjectURL\(blob\)/);
});

test('native email signup and password recovery return to the app that owns the PKCE verifier', () => {
    const source = readFileSync('auth.js', 'utf8');
    assert.match(source, /function getEmailAuthOptions\(options = \{\}\)/);
    assert.match(source, /isNativeApp\(\) \? \{ \.\.\.options, redirectTo: NATIVE_AUTH_CALLBACK_URL \} : options/);
    assert.match(source, /const authOptions = getEmailAuthOptions\(options\)/);
    assert.match(source, /resetPasswordForEmail\(email, getEmailAuthOptions\(options\)\)/);
});

test('native pending login can be explicitly cancelled after an interrupted cold start', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const auth = readFileSync('auth.js', 'utf8');
    assert.match(readFileSync('index.html', 'utf8'), /id="btn-native-auth-cancel"[^>]*hidden/);
    assert.match(auth, /export async function cancelNativeAuth\(/);
    assert.match(auth, /cancelNativeOAuth\(nativeAuthAdapter\(\)\)/);
    assert.match(auth, /if \(result\.error\) throw result\.error/);
    assert.match(source, /await cancelNativeAuth\(\)/);
    assert.match(source, /button\.hidden = !hasPendingNativeAuth\(\)/);
});

test('native bootstrap binds approved external policy and coordinate links', () => {
    const source = readFileSync('js/app.js', 'utf8');
    assert.match(source, /bindNativeExternalLinks\(\{/);
    assert.match(source, /외부 페이지를 열지 못했어요/);
});
