import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const contract = JSON.parse(readFileSync('mobile/store-privacy-contract.json', 'utf8'));
const appJson = JSON.parse(readFileSync('mobile/app.json', 'utf8')).expo;
const { buildExpoConfig } = require('../mobile/app.config.js');

test('store privacy contract distinguishes off-device collection from local photo processing', () => {
  assert.equal(contract.contractVersion, 1);
  assert.equal(contract.reviewStatus, 'store-console-review-required');
  assert.equal(contract.globalPractices.tracking, false);
  assert.equal(contract.globalPractices.advertising, false);
  assert.equal(contract.globalPractices.dataSale, false);
  assert.equal(contract.globalPractices.encryptedInTransit, true);
  assert.equal(contract.globalPractices.inAppAccountDeletion, true);

  const localIds = new Set(contract.localOnly.map((entry) => entry.id));
  for (const id of ['device_photo_originals', 'device_photo_metadata', 'device_photo_location', 'local_sqlite_index', 'thumbnail_cache', 'raw_share_token']) {
    assert.ok(localIds.has(id), `missing local-only boundary: ${id}`);
  }
  const publisher = readFileSync('mobile/src/publication-publisher.ts', 'utf8');
  assert.match(publisher, /lat: null/);
  assert.match(publisher, /lng: null/);
  assert.match(publisher, /location_precision: "approximate"/);
  assert.match(publisher, /metadataPolicy !== "stripped"/);
});

test('Apple privacy manifest covers app and bundled Maps or Places data without tracking', () => {
  const manifest = contract.apple.privacyManifest;
  assert.equal(manifest.NSPrivacyTracking, false);
  assert.deepEqual(manifest.NSPrivacyTrackingDomains, []);
  const rows = new Map(manifest.NSPrivacyCollectedDataTypes.map((entry) => [entry.NSPrivacyCollectedDataType, entry]));
  const expected = [
    'NSPrivacyCollectedDataTypeName', 'NSPrivacyCollectedDataTypeEmailAddress',
    'NSPrivacyCollectedDataTypeUserID', 'NSPrivacyCollectedDataTypePhotosorVideos',
    'NSPrivacyCollectedDataTypeOtherUserContent', 'NSPrivacyCollectedDataTypeSearchHistory',
    'NSPrivacyCollectedDataTypeProductInteraction', 'NSPrivacyCollectedDataTypeDeviceID',
    'NSPrivacyCollectedDataTypeCrashData', 'NSPrivacyCollectedDataTypePerformanceData',
    'NSPrivacyCollectedDataTypeOtherDiagnosticData', 'NSPrivacyCollectedDataTypePreciseLocation'
  ];
  assert.deepEqual([...rows.keys()].sort(), expected.sort());
  for (const row of rows.values()) assert.equal(row.NSPrivacyCollectedDataTypeTracking, false);

  const finalConfig = buildExpoConfig(appJson, { EXPO_PUBLIC_APP_ENV: 'development' });
  assert.deepEqual(finalConfig.ios.privacyManifests, manifest);
});

test('Google Play draft includes first-party and SDK collection while excluding unsupported claims', () => {
  const rows = new Map(contract.googlePlay.dataTypes.map((entry) => [entry.type, entry]));
  for (const type of [
    'Name', 'Email address', 'User IDs', 'Photos and videos', 'Other user-generated content',
    'App interactions', 'Search history', 'Device or other IDs', 'Crash logs', 'Diagnostics'
  ]) assert.ok(rows.has(type), `missing Google Play data type: ${type}`);
  for (const type of ['Approximate location', 'Precise location', 'Contacts', 'Financial info', 'Health info', 'Advertising data']) {
    assert.equal(rows.has(type), false, `unsupported Google Play declaration: ${type}`);
  }
  assert.equal(contract.googlePlay.dataShared, false);
  assert.equal(rows.get('Photos and videos').optional, true);
  assert.equal(rows.get('Device or other IDs').optional, false);
});

test('store disclosure tracks every network processor and has no unreviewed telemetry SDK', () => {
  assert.deepEqual(contract.processors.map((entry) => entry.id).sort(), [
    'google-kakao-oauth', 'google-maps-places', 'supabase'
  ]);
  const packageJson = readFileSync('mobile/package.json', 'utf8');
  assert.doesNotMatch(packageJson, /sentry|firebase-analytics|amplitude|mixpanel|appsflyer|adjust|facebook-sdk/i);
  for (const entry of [...contract.localOnly, ...contract.googlePlay.dataTypes, ...contract.processors]) {
    assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0, `missing evidence for ${entry.id ?? entry.type}`);
  }
});

test('installed Apple SDK privacy declarations are checked in local and CI release gates', () => {
  const packageJson = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
  const workflow = readFileSync('.github/workflows/mobile-ci.yml', 'utf8');
  const verifier = readFileSync('mobile/scripts/verify-store-privacy.mjs', 'utf8');

  assert.equal(packageJson.scripts['privacy:verify'], 'node ./scripts/verify-store-privacy.mjs');
  assert.match(workflow, /npm run audit:release[\s\S]*npm run privacy:verify/u);
  assert.match(verifier, /PrivacyInfo\.xcprivacy/u);
  assert.match(verifier, /NSPrivacyCollectedDataType/u);
  assert.match(verifier, /NSPrivacyAccessedAPICategory/u);
  assert.match(verifier, /NSPrivacyAccessedAPITypeReasons/u);
});

test('store-console handoff document preserves draft boundaries and operator approval gates', () => {
  const handoff = readFileSync('docs/mobile/store-privacy-disclosures.md', 'utf8');

  assert.match(handoff, /store-privacy-contract\.json/u);
  assert.match(handoff, /로컬 전용/u);
  assert.match(handoff, /App Store Connect/u);
  assert.match(handoff, /Google Play Console/u);
  assert.match(handoff, /법률 자문.*아니/u);
  assert.match(handoff, /privacy:verify/u);
  assert.match(handoff, /https:\/\/developer\.apple\.com\/app-store\/app-privacy-details\//u);
  assert.match(handoff, /https:\/\/support\.google\.com\/googleplay\/android-developer\/answer\/10787469/u);
});
