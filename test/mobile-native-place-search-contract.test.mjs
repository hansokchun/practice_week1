import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const androidBuild = await readFile(new URL('../mobile/modules/ikkyee-place-search/android/build.gradle', import.meta.url), 'utf8');
const androidSource = await readFile(new URL('../mobile/modules/ikkyee-place-search/android/src/main/java/expo/modules/ikkyeeplacesearch/IkkyeePlaceSearchModule.kt', import.meta.url), 'utf8');
const iosPodspec = await readFile(new URL('../mobile/modules/ikkyee-place-search/ios/IkkyeePlaceSearch.podspec', import.meta.url), 'utf8');
const iosSource = await readFile(new URL('../mobile/modules/ikkyee-place-search/ios/IkkyeePlaceSearchModule.swift', import.meta.url), 'utf8');
const exploreRepository = await readFile(new URL('../mobile/src/explore-photo-repository.ts', import.meta.url), 'utf8');
const setupDoc = await readFile(new URL('../docs/mobile/native-map-setup.md', import.meta.url), 'utf8');

test('Android place search uses the restricted app key and New Places SDK with a minimal bounded response', () => {
  assert.match(androidBuild, /places:places:5\.1\.1/);
  assert.match(androidSource, /com\.google\.android\.geo\.API_KEY/);
  assert.match(androidSource, /com\.ikkyee\.mobile/);
  assert.match(androidSource, /initializeWithNewPlacesApiEnabled/);
  assert.match(androidSource, /setMaxResultCount\(MAX_RESULTS\)/);
  assert.match(androidSource, /const val MAX_RESULTS = 5/);
  assert.match(androidSource, /PlacesStatusCodes\.OVER_QUERY_LIMIT/);
  assert.match(androidSource, /PlacesStatusCodes\.REQUEST_DENIED/);
  assert.match(androidSource, /CommonStatusCodes\.NETWORK_ERROR/);
  assert.match(androidSource, /E_PLACE_SEARCH_(?:QUOTA|CONFIGURATION|NETWORK)/);
  assert.doesNotMatch(androidSource, /https?:\/\/|println|Log\./);
});

test('iOS place search uses the restricted app key and aligned native Places SDK projection', () => {
  assert.match(iosPodspec, /GooglePlaces', '9\.4\.0'/);
  assert.match(iosSource, /GMSApiKey/);
  assert.match(iosSource, /com\.ikkyee\.mobile/);
  assert.match(iosSource, /GMSPlaceSearchByTextRequest/);
  assert.match(iosSource, /maxResultCount = 5/);
  assert.match(iosSource, /GMSPlacesErrorCode/);
  assert.match(iosSource, /usageLimitExceeded/);
  assert.match(iosSource, /incorrectBundleIdentifier/);
  assert.match(iosSource, /networkError/);
  assert.match(iosSource, /E_PLACE_SEARCH_(?:QUOTA|CONFIGURATION|NETWORK)/);
  assert.doesNotMatch(iosSource, /https?:\/\/|print\(|NSLog/);
});

test('release setup requires Places API New and platform-restricted keys', () => {
  assert.match(setupDoc, /Places API \(New\)/);
  assert.match(setupDoc, /Android.*SHA-1/s);
  assert.match(setupDoc, /iOS.*bundle ID/i);
  assert.match(setupDoc, /Powered by Google/);
});

test('photo scope reads the same saved coordinates for owner and public maps', () => {
  assert.match(exploreRepository, /\.eq\("visibility", "public"\)/);
  assert.match(exploreRepository, /\.in\("location_precision", \["approximate", "exact"\]\)/);
  assert.match(exploreRepository, /scope === "mine"[\s\S]*\.from\("photos"\)[\s\S]*\.eq\("owner_id", viewerId\)/);
  assert.doesNotMatch(exploreRepository, /\.from\("photo_private_locations"\)/);
  assert.match(exploreRepository, /scope === "others".*\.neq\("owner_id", viewerId\)/);
});
