# Ikkyee Public Beta Launch Checklist

**Updated:** 2026-07-22  
**Target:** Public beta (anyone can sign up, with a deliberately limited scope)  
**Product promise:** Choose photos, and a travel map is created.

## How To Use This Checklist

- The detailed working board lives in the Notion page **공개 베타 출시 작업**.
- This document is the version-controlled launch standard. Update it when a launch decision, risk, or gate changes.
- Every implementation task starts on `dev`, passes local verification, then is pushed to GitHub for the Cloudflare Preview deployment.
- Only explicitly approved, fully gated releases move from `dev` to `main`.

## Current Baseline

| Area | Status | Evidence |
| --- | --- | --- |
| Core product flow | Implemented | Home, upload, EXIF/location assignment, albums, Explore, public profiles, likes |
| Automated verification | Passing | `npm test`: 370 passing, 0 failing (2026-07-22) |
| Production build | Passing | `npm run build` (2026-07-22) |
| Preview delivery | Connected | GitHub `dev` push triggers Cloudflare Pages preview |
| Production delivery | Connected | GitHub `main` push triggers Cloudflare Pages production |
| Supabase RLS | Enabled | `photos`, `albums`, `album_photos`, `profiles`, `user_likes`, `comments` |
| Photo storage privacy | Blocked | `photos` bucket is currently public |
| Password safety | Blocked | Supabase leaked-password protection is disabled |

## Launch Gates

### P0: Release Blockers

- [x] Establish a passing automated-test and build baseline.
- [x] Approve the private-photo storage migration: private bucket, `storage_path`, signed URL policy, and rollback plan.
- [x] Backfill `photos.storage_path` for existing images while retaining compatibility with existing `url` values.
- [x] Add an RLS-controlled 15-minute signed URL resolver without exposing privileged credentials.
- [x] Move upload, image rendering, and deletion flows to the private-storage-compatible model.
- [ ] Verify private files fail for logged-out and non-owner accounts, while public Explore remains visible.
- [ ] Define and implement public location rules: exact, approximate, hidden, and unpublish/revoke behavior.
- [ ] Run three-account RLS and Storage QA: owner, another signed-in user, and logged-out user.
- [ ] Enable Supabase leaked-password protection and confirm email sign-up behavior.
- [ ] Record production environment variables, secrets ownership, backup/recovery steps, and migration rollback steps.
- [ ] Prepare privacy, location-sharing, account deletion, and support-contact copy for review before public publication.
- [ ] Run real-device authentication QA: email verification, reset, Google OAuth, Kakao OAuth, logout, and redirect behavior.
- [ ] Run real-photo lifecycle QA: GPS upload, manual location, edit, album assignment, visibility change, delete, and refresh recovery.
- [ ] Run public Explore QA: logged-out pins, detail views, likes, public albums, and public profiles.

### P1: Public Beta Readiness

- [ ] Test iOS Safari and Android Chrome for upload, maps, navigation, modal behavior, and safe areas.
- [ ] Make empty, loading, map-key, network, and upload-failure states actionable and non-sensitive.
- [ ] Measure mobile loading and route transitions; set an image-size and loading budget.
- [ ] Write a single incident runbook with Cloudflare/Supabase log paths, support contact, and rollback procedure.
- [ ] Define privacy-conscious beta metrics: sign-up, first upload, first album, first publish, and Explore engagement.
- [ ] Rehearse the production deployment, smoke test, and rollback path before public traffic.

### P2: After Public Beta Opens

- [ ] Collect and label feedback as bug, usability issue, or feature request.
- [ ] Reprioritize weekly using user impact and recurrence rather than feature novelty.
- [ ] Track storage, image traffic, active users, and service cost thresholds.

## Required Verification Scenarios

### Account

1. Sign up with email, verify the email, sign in, and sign out.
2. Reset a password and confirm the user returns safely to the app.
3. Test Google and Kakao OAuth from desktop and mobile browsers.

### Private Archive

1. Upload a GPS image and confirm map placement.
2. Upload an image without GPS, choose a point on the map, and save it.
3. Add photos to an album, edit a description, change visibility, delete a photo, then refresh.
4. Confirm a second account and a logged-out browser cannot view private records or image files.

### Public Exploration

1. Publish only approved photos with the intended location precision.
2. Confirm a logged-out browser can browse public pins and public profiles.
3. Like and unlike a public photo from a different account.
4. Revoke publication and confirm the pin, route, and image access disappear as designed.

## Deployment Rule

```text
Local tests and build
  -> GitHub dev push
  -> Cloudflare Preview QA
  -> P0 complete + P1 core QA complete
  -> explicit approval
  -> GitHub main push
  -> production smoke test and release record
```

## First Execution Order

1. Finish the private Storage migration design and create its implementation plan.
2. Decide the public location policy before exposing more public photos.
3. Implement and verify the Storage/RLS changes in `dev`.
4. Execute the account, photo lifecycle, and Explore QA scripts in Cloudflare Preview.
5. Prepare the operating and legal copy, then run the production rehearsal.

## References

- `docs/product/v2.1-current-scope-decision.md`
- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/product/operating-cost-estimate-2026-06-05.md`
- `docs/cloudflare.md`
- `docs/integrations.md`
