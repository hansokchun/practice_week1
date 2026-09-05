import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const appJson = JSON.parse(readFileSync('mobile/app.json', 'utf8')).expo;
const packageJson = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
const support = JSON.parse(readFileSync('mobile/platform-support.json', 'utf8'));
const { buildExpoConfig } = require('../mobile/app.config.js');

test('launch support contract matches Expo 57 and pinned native SDK minimums', () => {
  assert.equal(support.contractVersion, 1);
  assert.equal(support.expoSdk, 57);
  assert.equal(support.ios.minimumVersion, '16.4');
  assert.equal(support.ios.formFactor, 'iphone');
  assert.equal(support.android.minimumApiLevel, 24);
  assert.equal(support.android.minimumVersionName, '7.0');
  assert.equal(support.android.requiresGooglePlayServicesForNativeMaps, true);
  assert.equal(support.releaseQa.minimumFreeStorageMiB, 1024);
  assert.deepEqual(support.releaseQa.androidMemoryTiersGiB, [4, 6]);
  assert.equal(support.releaseQa.enforcedAsStoreCompatibilityFilter, false);
});

test('Expo configuration generates the exact iOS and Android minimum versions', () => {
  const config = buildExpoConfig(appJson, { EXPO_PUBLIC_APP_ENV: 'development' });
  assert.equal(config.ios.deploymentTarget, '16.4');
  assert.equal(config.ios.supportsTablet, false);
  const buildProperties = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
  assert.deepEqual(buildProperties, ['expo-build-properties', {
    android: { minSdkVersion: 24 },
    ios: { deploymentTarget: '16.4' }
  }]);
});

test('platform support drift check is pinned and required in CI', () => {
  assert.equal(packageJson.dependencies['expo-build-properties'], '~57.0.17');
  assert.equal(packageJson.scripts['platform:verify'], 'node ./scripts/verify-platform-support.mjs');
  const workflow = readFileSync('.github/workflows/mobile-ci.yml', 'utf8');
  assert.match(workflow, /npm run doctor[\s\S]*npm run platform:verify/u);
  const verifier = readFileSync('mobile/scripts/verify-platform-support.mjs', 'utf8');
  assert.match(verifier, /expo-modules-core/u);
  assert.match(verifier, /react-native-maps/u);
  assert.match(verifier, /PLACES_ANDROID_VERSION = '5\.1\.1'/u);
  assert.match(verifier, /PLACES_IOS_VERSION = '9\.4\.0'/u);
});

test('support policy distinguishes install floor, QA device tiers, and physical-device evidence', () => {
  const policy = readFileSync('docs/mobile/platform-support.md', 'utf8');
  assert.match(policy, /iOS 16\.4/u);
  assert.match(policy, /Android 7\.0.*API 24/u);
  assert.match(policy, /설치 하한/u);
  assert.match(policy, /QA.*기기 등급/u);
  assert.match(policy, /실기기.*미완료/u);
  assert.match(policy, /https:\/\/docs\.expo\.dev\/versions\/latest\//u);
});

test('prelaunch ledger records the minimum platform decision as complete', () => {
  const checklist = readFileSync('docs/mobile/prelaunch-checklist.md', 'utf8');
  assert.match(checklist, /- \[x\] 최소 지원 OS 버전과 기기 등급을 확정한다\./u);
});
