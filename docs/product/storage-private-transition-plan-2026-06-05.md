# Storage Private Bucket Transition Plan

Date: 2026-06-05
Project: Travelgram / Ikkyee

## Current State

- Supabase Storage bucket `photos` is private as of 2026-07-28.
- `photos.storage_path` is the canonical object identifier and runtime image surfaces use 15-minute signed URLs.
- Database RLS protects photo rows, but it does not protect the binary image file once someone has the public URL.
- The app currently relies on direct image URLs in these surfaces:
  - Myphoto recent photos
  - Personal photo page
  - Album compose and album detail
  - Explore pin preview
  - Public profile
  - Photo detail modal

## Implementation Status: 2026-07-28

- Added `public.photos.storage_path` and backfilled it for all 21 existing photo rows.
- Added the `photos_bucket_select_owned_or_public_photo` Storage SELECT policy. It permits an owner to read their own object and permits anyone to request a public photo object.
- The browser now requests 15-minute signed URLs for rows with `storage_path`; the old `url` column remains only as a migration fallback.
- New photo uploads persist `storage_path` and delete operations prefer that stored path.
- The signed-URL build reached `main`, the `photos` bucket was made private, and owner, non-owner, anonymous, direct-URL, and Production Explore checks passed.
- Album cover URLs are also rehydrated so public profile and album surfaces do not rely on the legacy public endpoint.

## Data Preservation Decision: 2026-07-27

The current photos, albums, likes, comments, locations, and Storage objects are pre-launch sample content. They may be deleted if retaining or repairing them would slow the private-bucket cutover. Auth accounts, schemas, policies, secrets, and deployment configuration are outside this deletion scope.

The cutover did not require object-by-object repair of the 21 existing sample rows because all rows already had canonical paths. The samples were retained as useful QA fixtures; this does not change their disposable classification.

### Completed Production Cutover

1. Deployed the signed-URL build to `main`.
2. Confirmed all 21 sample photo rows had `storage_path`; no reset was needed.
3. Made the `photos` bucket private.
4. Verified owner, another signed-in account, and logged-out access boundaries.
5. Verified legacy public URLs fail, public signed URLs work, private anonymous signing fails, and logged-out Production Explore remains visible.
6. Preserved Auth accounts, profiles, schemas, policies, secrets, and deployment configuration.

## Goal

Private photos should be genuinely private:

- A private photo file must not be accessible by URL unless the current user is the owner.
- Public photos should remain visible to logged-out users in Explore and public profiles.
- The UI should continue to receive ordinary image URLs, but those URLs may be short-lived signed URLs.

## Recommended Target Model

Use a private Storage bucket plus signed URLs.

Keep one bucket:

- `photos`: private bucket

Store file paths, not public URLs:

- Add `photos.storage_path text`
- Keep `photos.url` temporarily for backward compatibility during migration

Runtime URL rules:

- Owner viewing own private photo: frontend requests a signed URL.
- Logged-out or other user viewing public photo: frontend requests a signed URL only if the DB row is public.
- Private photo from another user: no signed URL.

## Access Boundary

Signed URLs are requested from the Supabase browser SDK under Storage RLS rather than through a privileged Pages Function.

- The owner can sign URLs for their own files through the existing object-owner policy.
- A public photo can receive a signed URL through `photos_bucket_select_owned_or_public_photo`.
- Private files for another user receive neither a direct object read nor a signed URL.
- No service-role key is exposed to the browser or stored in the repository.

## Migration Steps

### Phase 1: Schema Compatibility

Add `storage_path` to `photos`.

Backfill paths from existing public URLs where possible:

- Existing URL format includes `/storage/v1/object/public/photos/<path>`.
- Extract `<path>` into `storage_path`.

Frontend remains compatible:

- If `photo.signedUrl` exists, render it.
- Else fall back to `photo.url`.

### Phase 2: Upload Path Change

Change upload flow:

- Upload to private bucket path: `<owner_id>/<photo_id>-<safe_file_name>`.
- Save `storage_path`.
- Stop relying on public URL for private photos.

### Phase 3: Signed URL Resolver

Add a client helper:

- `resolvePhotoImageUrl(photo)`

Behavior:

- For old rows with `url`, use existing `url`.
- For new rows with `storage_path`, call `/api/photo-url`.
- Cache signed URLs in memory until shortly before expiry.

### Phase 4: Bucket Privacy Switch

After all current rows have `storage_path` and all screens use signed URLs:

- Change `photos` bucket from public to private.
- Verify private photo URLs no longer load when opened directly.
- Verify public Explore still renders logged-out.

### Phase 5: Remove Compatibility

After QA:

- Stop writing `photos.url` for new uploads, or keep it nullable.
- Remove public URL fallback from app surfaces.
- Optionally clean old public URL values.

## Risk Areas

- Explore logged-out rendering can break if public photos cannot resolve signed URLs without a session.
- Browser image caching may hide broken signed URL expiry behavior during QA.
- Current public URLs might remain reachable until the bucket is made private.
- If signed URLs expire while a page is open, images can disappear unless the resolver refreshes them.

## QA Checklist

- Logged-out user can see public Explore pins and photo previews.
- Logged-out user cannot open private photo file URLs.
- Logged-in owner can see private Myphoto images.
- Logged-in non-owner cannot resolve private image URLs.
- Upload creates `storage_path`.
- Deleting a photo removes the correct Storage object.
- Album and profile pages refresh expired signed URLs.

## Recommendation

The private Storage cutover is complete. Keep `storage_path`, signed-URL hydration, the private bucket setting, and the Storage policies as one release contract. Re-run the aggregate, role, HTTP, and browser checks before changing any part of that contract.

Before requesting or performing that approval, run:

```bash
npm run storage:preflight:check
```

After the preflight files are committed and pushed to `origin/dev`, run the full non-production gate:

```bash
npm run storage:preflight
```

The commands validate the signed-URL source contract, the latest aggregate Supabase cutover snapshot, Git branch ancestry, the deployed Preview, automated tests, and the production build. They do not push `main`, delete sample content, or change the bucket. Refresh the aggregate live Supabase evidence before any future Storage policy or bucket-privacy change.
