import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(readFileSync(join(mobileRoot, 'store-privacy-contract.json'), 'utf8'));
const dependencyRoots = [
  'node_modules/@react-native-async-storage/async-storage',
  'node_modules/expo-auth-session/node_modules/expo-application',
  'node_modules/expo-constants',
  'node_modules/expo-file-system',
  'node_modules/expo-media-library',
  'node_modules/react-native',
  'node_modules/react-native-maps',
];

function collectPrivacyManifests(directory, result = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectPrivacyManifests(path, result);
    else if (entry.isFile() && entry.name === 'PrivacyInfo.xcprivacy') result.push(path);
  }
  return result;
}

const manifestPaths = dependencyRoots.flatMap((path) => {
  const absolutePath = join(mobileRoot, path);
  assert.ok(statSync(absolutePath).isDirectory(), `privacy dependency is missing: ${path}`);
  return collectPrivacyManifests(absolutePath);
});
assert.ok(manifestPaths.length >= 10, `too few SDK PrivacyInfo.xcprivacy files: ${manifestPaths.length}`);
assert.ok(manifestPaths.some((path) => path.includes('GoogleMapsPrivacy.bundle')),
  'Google Maps SDK privacy manifest was not found');

const xml = manifestPaths.map((path) => readFileSync(path, 'utf8')).join('\n');
assert.doesNotMatch(xml, /<key>NSPrivacyTracking<\/key>\s*<true\s*\/>/u,
  'a dependency declares cross-app tracking');
assert.doesNotMatch(xml, /<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<true\s*\/>/u,
  'a dependency data type declares cross-app tracking');

const stringValues = [...xml.matchAll(/<string>([^<]+)<\/string>/gu)].map((match) => match[1]);
const dependencyCategories = new Set(stringValues.filter((value) => value.startsWith('NSPrivacyAccessedAPICategory')));
const dependencyReasons = new Set(stringValues.filter((value) => /^[0-9A-Z]{4}\.1$/u.test(value)));
const ignoredCollectedKeys = new Set([
  'NSPrivacyCollectedDataTypes',
  'NSPrivacyCollectedDataTypeLinked',
  'NSPrivacyCollectedDataTypeTracking',
  'NSPrivacyCollectedDataTypePurposes',
  'NSPrivacyCollectedDataTypePurposeAnalytics',
  'NSPrivacyCollectedDataTypePurposeAppFunctionality',
]);
const dependencyDataTypes = new Set(stringValues.filter((value) =>
  value.startsWith('NSPrivacyCollectedDataType') && !ignoredCollectedKeys.has(value)));

const appManifest = contract.apple.privacyManifest;
assert.equal(appManifest.NSPrivacyTracking, false);
assert.deepEqual(appManifest.NSPrivacyTrackingDomains, []);
const appAccessedApis = new Map(appManifest.NSPrivacyAccessedAPITypes.map((entry) => [
  entry.NSPrivacyAccessedAPIType,
  new Set(entry.NSPrivacyAccessedAPITypeReasons),
]));
const appDataTypes = new Set(appManifest.NSPrivacyCollectedDataTypes.map((entry) => entry.NSPrivacyCollectedDataType));

for (const category of dependencyCategories) {
  assert.ok(appAccessedApis.has(category), `app manifest does not cover SDK accessed API category: ${category}`);
}
const configuredReasons = new Set([...appAccessedApis.values()].flatMap((reasons) => [...reasons]));
for (const reason of dependencyReasons) {
  assert.ok(configuredReasons.has(reason), `app manifest does not cover SDK required-reason code: ${reason}`);
}
for (const dataType of dependencyDataTypes) {
  assert.ok(appDataTypes.has(dataType), `app manifest does not cover SDK collected data type: ${dataType}`);
}

console.log(
  `Store privacy verified: ${manifestPaths.length} SDK manifests, `
  + `${appDataTypes.size} collected data types, ${appAccessedApis.size} accessed API categories.`,
);
