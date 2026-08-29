import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('mobile/maestro/explore-smoke.yaml', 'utf8');
const runner = readFileSync('mobile/scripts/run-maestro.mjs', 'utf8');
const tabLayout = readFileSync('mobile/app/(tabs)/_layout.tsx', 'utf8');
const explore = readFileSync('mobile/app/(tabs)/index.tsx', 'utf8');
const myPhotos = readFileSync('mobile/app/(tabs)/my-photos.tsx', 'utf8');
const likes = readFileSync('mobile/app/(tabs)/likes.tsx', 'utf8');
const profile = readFileSync('mobile/app/profile.tsx', 'utf8');

test('Maestro smoke flow launches the standalone app from a privacy-safe state', () => {
  assert.match(workflow, /^appId: com\.ikkyee\.mobile$/m);
  assert.match(workflow, /- launchApp:\s*\n\s+clearState: true/);
  assert.match(workflow, /permissions:\s*\n\s+all: deny/);
  assert.doesNotMatch(workflow, /clearKeychain|email|password|token|secret/i);
  assert.match(runner, /maestro["'], \[["']test["'], workflow\]/);
});

test('Maestro smoke flow uses stable accessibility ids for every core guest surface', () => {
  for (const id of ['explore-screen', 'tab-my-photos', 'my-photos-screen', 'tab-likes', 'likes-screen', 'profile-open', 'profile-screen']) {
    assert.match(workflow, new RegExp(`id: ${id}`));
  }
  assert.match(tabLayout, /tabBarButtonTestID: `tab-\$\{tab\.name\}`/);
  assert.match(explore, /testID="explore-screen"/);
  assert.match(explore, /testID="profile-open"/);
  assert.match(myPhotos, /testID="my-photos-screen"/);
  assert.match(likes, /testID="likes-screen"/);
  assert.match(profile, /testID="profile-screen"/);
});

test('Maestro smoke flow covers navigation, denied media access, and local validation without test accounts', () => {
  assert.match(workflow, /id: tab-my-photos[\s\S]*id: my-photos-screen/);
  assert.match(workflow, /기기 사진을 가져오세요/);
  assert.match(workflow, /id: tab-likes[\s\S]*id: likes-screen/);
  assert.match(workflow, /id: profile-open[\s\S]*id: profile-screen/);
  assert.match(workflow, /id: place-search-submit[\s\S]*장소를 검색하지 못했어요/);
});
