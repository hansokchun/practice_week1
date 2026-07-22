# Private Photo Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every new and migrated photo from a short-lived signed URL so that the Supabase `photos` bucket can become private without breaking Ikkyee.

**Architecture:** Keep `photos.url` only as a legacy fallback and add `photos.storage_path` as the canonical object identifier. Browser code asks Supabase Storage for signed URLs using normal RLS permissions, so no service-role credential enters the browser or repository. A new `storage.objects` SELECT policy lets anyone request a URL for a public photo while keeping private objects available only to their owner.

**Tech Stack:** Vanilla JavaScript, Supabase browser SDK, Supabase Postgres/Storage RLS, Node built-in tests, Cloudflare Pages.

---

### Task 1: Define the storage-path and signed-URL contract

**Files:**
- Create: `js/photo-storage.mjs`
- Test: `test/photo-storage.test.mjs`

- [x] **Step 1: Write failing tests for canonical path selection and signed URL application.**

```js
assert.equal(getPhotoStoragePath({ storage_path: 'user/photo.jpg' }), 'user/photo.jpg');
assert.equal(getPhotoStoragePath({ url: 'https://x/storage/v1/object/public/photos/user/photo.jpg' }), 'user/photo.jpg');
assert.deepEqual(applySignedPhotoUrls([{ id: '1', storage_path: 'a.jpg' }], new Map([['a.jpg', 'https://signed']]))[0].url, 'https://signed');
```

- [x] **Step 2: Run the focused test and confirm it fails because the module is absent.**

Run: `node --test test/photo-storage.test.mjs`

- [x] **Step 3: Add the minimal pure helper module.**

```js
export function getPhotoStoragePath(photo = {}) { /* storage_path first, legacy URL second */ }
export function applySignedPhotoUrls(photos, signedUrlByPath) { /* copy rows and replace url */ }
```

- [x] **Step 4: Run the focused test and confirm it passes.**

Run: `node --test test/photo-storage.test.mjs`

### Task 2: Use signed URLs in the Supabase data boundary

**Files:**
- Modify: `auth.js`
- Modify: `test/supabase-select-columns.test.mjs`
- Test: `test/photo-storage.test.mjs`

- [x] **Step 1: Add failing source-contract tests for `storage_path` selection, signed URL hydration, and upload return data.**

```js
assert.match(auth, /storage_path/);
assert.match(auth, /createSignedUrls\(paths, 900\)/);
assert.match(auth, /createSignedUrl\(fileName, 900\)/);
```

- [x] **Step 2: Run the focused tests and confirm they fail because signed URL hydration is absent.**

Run: `node --test test/photo-storage.test.mjs test/supabase-select-columns.test.mjs`

- [x] **Step 3: Add `storage_path` persistence and signed URL hydration.**

```js
const PHOTO_SELECT_COLUMNS = '...,storage_path';
// fetchPhotos: request signed URLs for rows with storage_path, then return copied rows.
// uploadImage: upload, create a 15-minute signed URL, return { storagePath, url }.
// deletePhoto: prefer storagePath, then legacy URL parsing.
```

- [x] **Step 4: Run the focused tests and confirm they pass.**

Run: `node --test test/photo-storage.test.mjs test/supabase-select-columns.test.mjs`

### Task 3: Connect upload and delete callers to the new contract

**Files:**
- Modify: `js/app.js`
- Modify: `test/photo-file-validation.test.mjs`
- Modify: `test/personal-photo-delete-confirm.test.mjs`

- [x] **Step 1: Add failing source-contract tests requiring an uploaded `storagePath` to be stored in the photo record and supplied on delete.**

```js
assert.match(app, /const \{ url, storagePath, error: uploadError \} = await uploadImage/);
assert.match(app, /storage_path: storagePath/);
assert.match(app, /deletePhoto\(photo.id, photo.url, photo.storage_path\)/);
```

- [x] **Step 2: Run the focused tests and confirm they fail.**

Run: `node --test test/photo-file-validation.test.mjs test/personal-photo-delete-confirm.test.mjs`

- [x] **Step 3: Update upload records, photo normalization, and deletes without changing the current rendered URL interface.**

- [x] **Step 4: Run the focused tests and confirm they pass.**

Run: `node --test test/photo-file-validation.test.mjs test/personal-photo-delete-confirm.test.mjs`

### Task 4: Apply the reversible Supabase compatibility migration

**Files:**
- Modify: `docs/product/storage-private-transition-plan-2026-06-05.md`
- Test: live SQL queries through the Supabase MCP

- [x] **Step 1: Add `photos.storage_path` and backfill legacy public object paths without changing bucket visibility.**

```sql
alter table public.photos add column if not exists storage_path text;
update public.photos
set storage_path = split_part(split_part(url, '/storage/v1/object/public/photos/', 2), '?', 1)
where storage_path is null and url like '%/storage/v1/object/public/photos/%';
```

- [x] **Step 2: Add a `storage.objects` SELECT policy for object owners and rows whose photo visibility is public.**

```sql
create policy "photos_bucket_select_owned_or_public_photo"
on storage.objects for select to anon, authenticated
using (bucket_id = 'photos' and (owner_id = (select auth.uid())::text or exists (...)));
```

- [x] **Step 3: Verify all existing photo rows have a path where their legacy public URL had one, and verify the policy exists.**

- [x] **Step 4: Document that the bucket remains public until the `main` deployment is live.**

### Task 5: Verify and deliver Preview readiness

**Files:**
- Modify: `docs/product/public-beta-launch-checklist-2026-07-22.md`
- Update: Notion `공개 베타 출시 작업`

- [x] **Step 1: Run `npm test` and `npm run build`.**
- [ ] **Step 2: Push the verified implementation to `origin/dev` and wait for Cloudflare Preview.**
- [ ] **Step 3: Record the completed compatibility work and keep `photos 버킷을 private으로 전환` blocked until an explicit `main` deployment request.**
