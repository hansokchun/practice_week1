import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobileExplore = readFileSync('mobile/src/explore-photo-repository.ts', 'utf8');
const mobilePublisher = readFileSync('mobile/src/publication-publisher.ts', 'utf8');
const baseline = readFileSync('supabase/migrations/20260724000000_initial_remote_schema_baseline.sql', 'utf8');
const audit = readFileSync('docs/mobile/public-location-policy-audit.md', 'utf8');

test('mobile Explore accepts only public exact or approximate map locations', () => {
  assert.match(mobileExplore, /\.eq\("visibility", "public"\)/);
  assert.match(mobileExplore, /\.in\("location_precision", \["approximate", "exact"\]\)/);
  assert.match(mobileExplore, /!\["approximate", "exact"\]\.includes/);
});

test('database projection enforces hidden, approximate, and exact publication boundaries', () => {
  assert.match(baseline, /new\.location_precision = 'hidden'[\s\S]*new\.lat := null;[\s\S]*new\.lng := null;/);
  assert.match(baseline, /new\.location_precision = 'approximate'[\s\S]*round\(source_lat::numeric, 2\)[\s\S]*round\(source_lng::numeric, 2\)/);
  assert.match(baseline, /else[\s\S]*new\.lat := source_lat;[\s\S]*new\.lng := source_lng;/);
});

test('the mobile audit records the current conservative publication boundary', () => {
  assert.match(mobilePublisher, /location_precision: "hidden"/);
  assert.match(audit, /mobile publication[^\n]*`hidden`/i);
  assert.match(audit, /web[^\n]*`exact`[^\n]*`approximate`[^\n]*`hidden`/i);
  assert.match(audit, /shared Supabase `photos` rows/i);
  assert.match(audit, /does not claim[^\n]*mobile[^\n]*exact/i);
});
