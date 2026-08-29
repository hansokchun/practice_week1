import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const support = JSON.parse(readFileSync(join(mobileRoot, 'platform-support.json'), 'utf8'));
const appJson = JSON.parse(readFileSync(join(mobileRoot, 'app.json'), 'utf8')).expo;
const packageJson = JSON.parse(readFileSync(join(mobileRoot, 'package.json'), 'utf8'));
const capabilities = JSON.parse(readFileSync(join(mobileRoot, 'src/native-media-capabilities.json'), 'utf8'));
const { buildExpoConfig } = require(join(mobileRoot, 'app.config.js'));
const PLACES_ANDROID_VERSION = '5.1.1';
const PLACES_IOS_VERSION = '9.4.0';

assert.equal(support.expoSdk, 57);
assert.match(packageJson.dependencies.expo, /^~57\./u);
assert.match(packageJson.dependencies['expo-build-properties'], /^~57\./u);
assert.equal(appJson.ios.supportsTablet, false);

const config = buildExpoConfig(appJson, { EXPO_PUBLIC_APP_ENV: 'development' });
assert.equal(config.ios.deploymentTarget, support.ios.minimumVersion);
const buildProperties = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
assert.deepEqual(buildProperties?.[1], {
  android: { minSdkVersion: support.android.minimumApiLevel },
  ios: { deploymentTarget: support.ios.minimumVersion }
});

const expoModulesCore = readFileSync(join(mobileRoot, 'node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle'), 'utf8');
const reactNativeMaps = readFileSync(join(mobileRoot, 'node_modules/react-native-maps/android/build.gradle'), 'utf8');
const placesAndroid = readFileSync(join(mobileRoot, 'modules/ikkyee-place-search/android/build.gradle'), 'utf8');
const placesIos = readFileSync(join(mobileRoot, 'modules/ikkyee-place-search/ios/IkkyeePlaceSearch.podspec'), 'utf8');
assert.match(expoModulesCore, /minSdkVersion project\.ext\.safeExtGet\("minSdkVersion", 24\)/u);
assert.match(reactNativeMaps, /minSdkVersion safeExtGet\('minSdkVersion', 21\)/u);
assert.match(placesAndroid, new RegExp(`places:${PLACES_ANDROID_VERSION.replaceAll('.', '\\.')}`, 'u'));
assert.match(placesIos, new RegExp(`GooglePlaces', '${PLACES_IOS_VERSION.replaceAll('.', '\\.')}'`, 'u'));

for (const dependency of support.android.dependencyFloors) {
  assert.ok(dependency.minimumApiLevel <= support.android.minimumApiLevel,
    `${dependency.id} exceeds the Android support floor`);
}
for (const dependency of support.ios.dependencyFloors) {
  assert.ok(Number(dependency.minimumVersion) <= Number(support.ios.minimumVersion),
    `${dependency.id} exceeds the iOS support floor`);
}

assert.equal(capabilities.platforms.ios.minimumOsVersion, support.ios.minimumVersion);
assert.equal(capabilities.platforms.android.minimumApiLevel, support.android.minimumApiLevel);
assert.equal(support.releaseQa.enforcedAsStoreCompatibilityFilter, false);

process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  expoSdk: support.expoSdk,
  iosMinimum: support.ios.minimumVersion,
  androidMinimumApi: support.android.minimumApiLevel,
  dependencyFloorCount: support.ios.dependencyFloors.length + support.android.dependencyFloors.length
})}\n`);
