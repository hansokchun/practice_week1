import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createAndroidAssociationResponse,
  createAppleAssociationResponse,
  createPhotoLinkFallbackResponse
} from '../functions/_shared/mobile-link-association.mjs';

const appleRoute = await readFile(new URL('../functions/.well-known/apple-app-site-association.js', import.meta.url), 'utf8');
const androidRoute = await readFile(new URL('../functions/.well-known/assetlinks.json.js', import.meta.url), 'utf8');
const fallbackRoute = await readFile(new URL('../functions/photo-link/index.js', import.meta.url), 'utf8');
const fallbackScript = await readFile(new URL('../public/mobile-photo-link-fallback.js', import.meta.url), 'utf8');
const setupDoc = await readFile(new URL('../docs/mobile/universal-links.md', import.meta.url), 'utf8');

test('AASA is fail-closed and authorizes only the private photo link path', async () => {
  assert.equal(createAppleAssociationResponse({}).status, 404);
  const response = createAppleAssociationResponse({ APPLE_TEAM_ID: 'A1B2C3D4E5' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.deepEqual(await response.json(), {
    applinks: {
      apps: [],
      details: [{ appID: 'A1B2C3D4E5.com.ikkyee.mobile', paths: ['/photo-link', '/photo-link/'] }]
    }
  });
});

test('Digital Asset Links rejects malformed fingerprints and supports signing rotation', async () => {
  const first = Array(32).fill('AA').join(':');
  const second = Array(32).fill('B7').join(':');
  assert.equal(createAndroidAssociationResponse({ ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS: 'unsafe' }).status, 404);
  const response = createAndroidAssociationResponse({
    ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS: `${first}, ${second}`
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.ikkyee.mobile',
      sha256_cert_fingerprints: [first, second]
    }
  }]);
});

test('the no-install fallback keeps bearer tokens out of the server request and referrer', async () => {
  const token = 'a'.repeat(64);
  const response = createPhotoLinkFallbackResponse();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  const body = await response.text();
  assert.doesNotMatch(body, new RegExp(token));
  assert.match(body, /mobile-photo-link-fallback\.js/);
  assert.match(fallbackScript, /location\.hash\.slice\(1\)/);
  assert.match(fallbackScript, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(fallbackScript, /ikkyee:\/\/photo-link\//);
  assert.match(fallbackScript, /history\.replaceState/);
  assert.doesNotMatch(fallbackScript, /fetch\(|XMLHttpRequest|console\./);
});

test('Cloudflare routes delegate exact well-known and fallback paths to the reviewed helpers', () => {
  assert.match(appleRoute, /createAppleAssociationResponse/);
  assert.match(androidRoute, /createAndroidAssociationResponse/);
  assert.match(fallbackRoute, /createPhotoLinkFallbackResponse/);
  assert.match(setupDoc, /APPLE_TEAM_ID/);
  assert.match(setupDoc, /ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS/);
  assert.match(setupDoc, /https:\/\/practice-week1-cws\.pages\.dev\/photo-link/);
});
