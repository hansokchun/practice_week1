import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const appJson = require('../mobile/app.json');
const { buildExpoConfig } = require('../mobile/app.config.js');

test('development keeps the privacy-safe map fallback when native keys are absent', () => {
  const config = buildExpoConfig(appJson.expo, { EXPO_PUBLIC_APP_ENV: 'development' });
  assert.equal(config.extra.nativeMapsEnabled, false);
  assert.equal(config.extra.nativePlaceSearchEnabled, false);
  assert.equal(config.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-maps'), false);
});

test('preview and production reject missing or partial native map keys before build', () => {
  assert.throws(() => buildExpoConfig(appJson.expo, { EXPO_PUBLIC_APP_ENV: 'preview' }), /map configuration/i);
  assert.throws(() => buildExpoConfig(appJson.expo, {
    EXPO_PUBLIC_APP_ENV: 'production',
    GOOGLE_MAPS_ANDROID_API_KEY: 'android-placeholder'
  }), /map configuration/i);
});

test('restricted iOS and Android keys enable the native map config plugin together', () => {
  const config = buildExpoConfig(appJson.expo, {
    EXPO_PUBLIC_APP_ENV: 'production',
    GOOGLE_MAPS_ANDROID_API_KEY: 'android-placeholder',
    GOOGLE_MAPS_IOS_API_KEY: 'ios-placeholder'
  });
  assert.equal(config.extra.nativeMapsEnabled, true);
  assert.equal(config.extra.nativePlaceSearchEnabled, true);
  assert.equal(config.extra.publicLinkOrigin, 'https://practice-week1-cws.pages.dev');
  assert.deepEqual(config.ios.associatedDomains, ['applinks:practice-week1-cws.pages.dev']);
  assert.ok(config.android.intentFilters.some((filter) => filter.autoVerify === true &&
    filter.action === 'VIEW' && filter.data.some((entry) => entry.scheme === 'https' &&
      entry.host === 'practice-week1-cws.pages.dev' && entry.path === '/photo-link')));
  assert.ok(config.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-maps' &&
    plugin[1].androidGoogleMapsApiKey === 'android-placeholder' &&
    plugin[1].iosGoogleMapsApiKey === 'ios-placeholder'));
});

test('release link origins are fixed to the matching production or preview Pages domain', () => {
  assert.throws(() => buildExpoConfig(appJson.expo, {
    EXPO_PUBLIC_APP_ENV: 'production',
    EXPO_PUBLIC_LINK_ORIGIN: 'https://attacker.example',
    GOOGLE_MAPS_ANDROID_API_KEY: 'android-placeholder',
    GOOGLE_MAPS_IOS_API_KEY: 'ios-placeholder'
  }), /link origin/i);

  const preview = buildExpoConfig(appJson.expo, {
    EXPO_PUBLIC_APP_ENV: 'preview',
    GOOGLE_MAPS_ANDROID_API_KEY: 'android-placeholder',
    GOOGLE_MAPS_IOS_API_KEY: 'ios-placeholder'
  });
  assert.equal(preview.extra.publicLinkOrigin, 'https://dev.practice-week1-cws.pages.dev');
});
