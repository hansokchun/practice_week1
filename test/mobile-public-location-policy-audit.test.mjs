import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobileExplore = readFileSync('mobile/src/explore-photo-repository.ts', 'utf8');
const mobilePublisher = readFileSync('mobile/src/publication-publisher.ts', 'utf8');
const accuracyMigration = readFileSync('supabase/migrations/20260904123000_reinterpret_location_precision_as_accuracy.sql', 'utf8');
const audit = readFileSync('docs/mobile/public-location-policy-audit.md', 'utf8');

test('mobile Explore accepts only public exact or approximate map locations', () => {
  assert.match(mobileExplore, /\.eq\("visibility", "public"\)/);
  assert.match(mobileExplore, /\.in\("location_precision", \["approximate", "exact"\]\)/);
  assert.match(mobileExplore, /!\["approximate", "exact"\]\.includes/);
});

test('database keeps the selected point unchanged for both accuracy labels', () => {
  assert.match(accuracyMigration, /set lat = source\.lat,\s*lng = source\.lng/s);
  assert.doesNotMatch(accuracyMigration, /round\s*\(/i);
  assert.match(accuracyMigration, /location_precision in \('exact', 'approximate'\)/);
});

test('the mobile audit records location accuracy independently from coordinates', () => {
  assert.match(mobilePublisher, /location_precision: hasLocation \? sourceMetadata\.locationPrecision : "approximate"/);
  assert.match(audit, /좌표의 이동이나 공개 범위가 아니라/);
  assert.match(audit, /`exact`[^\n]*`approximate`/i);
  assert.match(audit, /같은 Supabase `photos` 행/);
  assert.match(audit, /모바일 신규 게시 흐름은 로컬에 저장된 촬영일과 위치를 같은 `photos` 행에 전송한다/);
});
