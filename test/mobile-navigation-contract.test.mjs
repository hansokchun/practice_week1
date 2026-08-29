import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const routes = readFileSync('mobile/src/mobile-routes.ts', 'utf8');
const navigation = readFileSync('docs/mobile/navigation-contract.md', 'utf8');

const routeFiles = [
  'mobile/app/(tabs)/index.tsx',
  'mobile/app/(tabs)/my-photos.tsx',
  'mobile/app/(tabs)/likes.tsx',
  'mobile/app/explore.tsx',
  'mobile/app/upload.tsx',
  'mobile/app/profile.tsx',
  'mobile/app/auth/login.tsx',
  'mobile/app/auth/callback.tsx',
  'mobile/app/auth/update-password.tsx',
  'mobile/app/device-photo/[assetId].tsx',
  'mobile/app/device-photo/[assetId]/location.tsx',
  'mobile/app/publish/review.tsx',
  'mobile/app/explore-photo/[photoId].tsx',
  'mobile/app/public-profile/[userId].tsx',
  'mobile/app/photo-link/[token].tsx',
  'mobile/app/photo-link/index.tsx',
];

test('every launch route resolves to a concrete Expo Router screen', () => {
  for (const path of routeFiles) assert.equal(existsSync(path), true, path);
  assert.match(routes, /exploreRoute[\s\S]*myPhotosRoute[\s\S]*likesRoute[\s\S]*uploadRoute/);
  assert.doesNotMatch(routes, /album/i);
});

test('the core route graph wires discovery, local photos, publication, auth, and recovery', () => {
  const landing = readFileSync('mobile/app/(tabs)/index.tsx', 'utf8');
  const explore = readFileSync('mobile/app/explore.tsx', 'utf8');
  const tabLayout = readFileSync('mobile/app/(tabs)/_layout.tsx', 'utf8');
  const myPhotos = readFileSync('mobile/app/(tabs)/my-photos.tsx', 'utf8');
  const detail = readFileSync('mobile/app/device-photo/[assetId].tsx', 'utf8');
  const publicDetail = readFileSync('mobile/app/explore-photo/[photoId].tsx', 'utf8');
  const callback = readFileSync('mobile/app/auth/callback.tsx', 'utf8');
  const universalLink = readFileSync('mobile/app/photo-link/index.tsx', 'utf8');

  assert.match(landing, /LandingScreen[\s\S]*publicPhotoDetailRoute/);
  assert.match(explore, /ExploreScreen/);
  assert.match(tabLayout, /tabBarStyle: \{ display: "none" \}/);
  assert.match(myPhotos, /devicePhotoDetailRoute/);
  assert.match(myPhotos, /publicationReviewRoute/);
  assert.match(detail, /devicePhotoLocationRoute/);
  assert.match(publicDetail, /publicProfileRoute/);
  assert.match(callback, /passwordUpdateRoute[\s\S]*profileRoute/);
  assert.match(universalLink, /extractMobilePhotoShareToken[\s\S]*PhotoLinkScreen/);
});

test('the navigation record distinguishes automated coverage from device-only gates', () => {
  assert.match(navigation, /랜딩[^\n]*공개 사진 상세[^\n]*공개 프로필/);
  assert.match(navigation, /랜딩[^\n]*Explore/);
  assert.match(navigation, /내 사진[^\n]*기기 사진 상세[^\n]*위치 편집/);
  assert.match(navigation, /내 사진[^\n]*게시 확인/);
  assert.match(navigation, /automated[^\n]*real-device/i);
});
