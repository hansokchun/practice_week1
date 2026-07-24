# Ikkyee Public Beta Launch Checklist

**Updated:** 2026-07-25

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
| Automated verification | Passing | `npm test`: 387 passing, 0 failing (2026-07-25) |
| Production build | Passing | `npm run build` (2026-07-25) |
| Preview delivery | Verified | GitHub `dev` push triggers Cloudflare Pages Preview; current Preview: `https://dev.practice-week1-cws.pages.dev` |
| Production delivery | Connected | GitHub `main` push triggers Cloudflare Pages production |
| Supabase RLS | Enabled | `photos`, `albums`, `album_photos`, `profiles`, `user_likes`, `comments` |
| Photo storage privacy | QA pending | `storage_path` backfill and signed URL compatibility are deployed to `dev`; the bucket remains public until three-account access QA and the private cutover decision |
| Public location privacy | Implemented, QA pending | Location precision and owner-only source coordinates are implemented; public/owner/logged-out validation remains |
| Public Explore QA | Passing | Logged-out pins, photo details, public profiles/albums, non-owner likes, and scope switching verified in Cloudflare Preview |
| Explore map search | Modernized | Deprecated `SearchBox` replaced with async Google Places `Autocomplete` integration |
| Browser response headers | Implemented | Cloudflare Pages Preview returns CSP, frame, content-type, referrer, and permissions headers |
| Password safety | Deferred on Free | Supabase leaked-password protection requires a paid plan; revisit after a plan upgrade |
| Database backup/PITR | Helper implemented, live export pending | Automatic backups and PITR are unavailable; `npm run backup:db` creates an encrypted roles/schema/data export outside the repository. Docker and a database connection string are still required for the first live export. |

## Launch Gates

### P0: Release Blockers

- [x] Establish a passing automated-test and build baseline.
- [x] Approve the private-photo storage migration: private bucket, `storage_path`, signed URL policy, and rollback plan.
- [x] Backfill `photos.storage_path` for existing images while retaining compatibility with existing `url` values.
- [x] Add an RLS-controlled 15-minute signed URL resolver without exposing privileged credentials.
- [x] Move upload, image rendering, and deletion flows to the private-storage-compatible model.
- [ ] Verify private files fail for logged-out and non-owner accounts, while public Explore remains visible.
- [x] Define and implement public location rules: exact, approximate, hidden, and unpublish/revoke behavior.
- [ ] Run three-account RLS and Storage QA: owner, another signed-in user, and logged-out user.
- [ ] **Deferred while on Supabase Free:** enable leaked-password protection and confirm email sign-up behavior after upgrading to a paid plan.
- [ ] Confirm the production environment inventory, secret ownership, backup/recovery steps, and migration rollback steps in the operator dashboard. The documented runbook is ready for that confirmation.
- [x] Prepare privacy, location-sharing, account deletion, and support-contact copy for review before public publication. Final support address, retention policy, and legal review remain explicit pre-launch approvals.
- [ ] Run real-device authentication QA: email verification, reset, Google OAuth, Kakao OAuth, logout, and redirect behavior.
- [ ] Run real-photo lifecycle QA: GPS upload, manual location, edit, album assignment, visibility change, delete, and refresh recovery.
- [x] Run public Explore QA: logged-out pins, detail views, likes, public albums, and public profiles.

### Recently Completed Hardening

- [x] Replace deprecated Google Maps Explore search integration with the supported `Autocomplete` API and async loader.
- [x] Add Cloudflare Pages response security headers and verify them against the `dev` Preview deployment.

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

1. Run the three-account Storage/RLS access QA in Cloudflare Preview, then make the explicit private-bucket cutover decision.
2. Install/start Docker, run and record the first Free-plan encrypted export, then rehearse recovery against a disposable project before the next production data change. The export helper and procedure are implemented.
3. Execute the account, photo lifecycle, and Explore QA scripts in Cloudflare Preview.
4. Prepare the operating and legal copy, then run the production rehearsal.
5. Revisit leaked-password protection only when the Supabase plan is upgraded.

## References

- `docs/product/v2.1-current-scope-decision.md`
- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/product/operating-cost-estimate-2026-06-05.md`
- `docs/product/public-beta-privacy-and-support-draft-2026-07-24.md`
- `docs/cloudflare.md`
- `docs/integrations.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
