# Ikkyee Public Beta Launch Checklist

**Updated:** 2026-07-26

**Target:** Public beta (anyone can sign up, with a deliberately limited scope)  
**Product promise:** Choose photos, and a travel map is created.
**P0 progress:** 9 of 14 gates complete; 5 remain, including 1 paid-plan deferral.

## How To Use This Checklist

- The detailed working board lives in the Notion page **공개 베타 출시 작업**.
- This document is the version-controlled launch standard. Update it when a launch decision, risk, or gate changes.
- Every implementation task starts on `dev`, passes local verification, then is pushed to GitHub for the Cloudflare Preview deployment.
- Only explicitly approved, fully gated releases move from `dev` to `main`.

## Current Baseline

| Area | Status | Evidence |
| --- | --- | --- |
| Core product flow | Implemented | Home, upload, EXIF/location assignment, albums, Explore, public profiles, likes |
| Automated verification | Passing | `npm test`: 417 passing, 0 failing (2026-07-26) |
| Production build | Passing | `npm run build` (2026-07-26) |
| Preview delivery | Verified | GitHub `dev` push triggers Cloudflare Pages Preview; current Preview: `https://dev.practice-week1-cws.pages.dev` |
| Production delivery | Connected | GitHub `main` push triggers Cloudflare Pages production |
| Supabase RLS | Enabled | `photos`, `albums`, `album_photos`, `profiles`, `user_likes`, `comments` |
| Photo storage privacy | Cutover blocked by production release | `dev` is signed-URL compatible, but `origin/main` still uses public URLs and is 443 commits behind `origin/dev` as of 2026-07-25. The shared bucket must remain public until an explicitly approved `main` release. |
| Public location privacy | Implemented, QA pending | Location precision and owner-only source coordinates are implemented; public/owner/logged-out validation remains |
| Public Explore QA | Passing | Logged-out pins, photo details, public profiles/albums, non-owner likes, and scope switching verified in Cloudflare Preview |
| Explore map search | Modernized | Deprecated `SearchBox` replaced with async Google Places `Autocomplete` integration |
| Browser response headers | Implemented | Cloudflare Pages Preview returns CSP, frame, content-type, referrer, and permissions headers |
| Authentication QA | Partial, P0 open | Desktop logout, auth entry, provider initiation, and a 390 x 844 responsive pass are recorded; Supabase Site URL now uses Production Pages, while physical devices, email links, and final OAuth consent remain |
| Password safety | Deferred on Free | Supabase leaked-password protection requires a paid plan; revisit after a plan upgrade |
| Operations inventory | Cloudflare audit complete | Git/build/branch settings and environment key names were verified on 2026-07-25. The unused `SUPABASE_JWT_SECRET` and `MY_BUCKET` binding were removed without inspecting secret values or deleting the R2 bucket. |
| Database backup/PITR | Runtime ready, live export pending | Automatic backups and PITR are unavailable; user-local Colima/Docker and Supabase CLI prerequisites now pass. `npm run backup:db` creates an encrypted roles/schema/data export outside the repository after private operator credential entry. |

## Launch Gates

### P0: Release Blockers

- [x] Establish a passing automated-test and build baseline.
- [x] Approve the private-photo storage migration: private bucket, `storage_path`, signed URL policy, and rollback plan.
- [x] Backfill `photos.storage_path` for existing images while retaining compatibility with existing `url` values.
- [x] Add an RLS-controlled 15-minute signed URL resolver without exposing privileged credentials.
- [x] Move upload, image rendering, and deletion flows to the private-storage-compatible model.
- [ ] Verify private files fail for logged-out and non-owner accounts, while public Explore remains visible. Pre-cutover RLS and signed-URL checks pass; direct private URLs remain reachable while the shared bucket is public.
- [x] Define and implement public location rules: exact, approximate, hidden, and unpublish/revoke behavior.
- [ ] Run three-account RLS and Storage QA: owner, another signed-in user, and logged-out user. Role-level checks pass; the final browser regression must follow the private-bucket cutover.
- [ ] **Deferred while on Supabase Free:** enable leaked-password protection and confirm email sign-up behavior after upgrading to a paid plan.
- [ ] Confirm the production environment inventory, secret ownership, backup/recovery steps, and migration rollback steps in the operator dashboard. Cloudflare settings, unused-secret cleanup, and the local backup runtime are complete; the first encrypted backup/restore rehearsal remains.
- [x] Prepare privacy, location-sharing, account deletion, and support-contact copy for review before public publication. Final support address, retention policy, and legal review remain explicit pre-launch approvals.
- [ ] Run real-device authentication QA: email verification, reset, Google OAuth, Kakao OAuth, logout, and redirect behavior.
- [x] Run real-photo lifecycle QA: GPS upload, manual location, edit, album assignment, visibility change, delete, and refresh recovery.
- [x] Run public Explore QA: logged-out pins, detail views, likes, public albums, and public profiles.

### Recently Completed Hardening

- [x] Replace deprecated Google Maps Explore search integration with the supported `Autocomplete` API and async loader.
- [x] Add Cloudflare Pages response security headers and verify them against the `dev` Preview deployment.
- [x] Distinguish saved-library failures from empty states, add retry actions, and replace map/upload backend details with safe user-facing guidance.
- [x] Add enforceable JS, CSS, and image budgets; remove 8 MB of unused PNG build output; and record mobile route-render timing.
- [x] Consolidate incident ownership, severity, Cloudflare/Supabase log paths, reversible rollback, privacy safeguards, and closeout evidence into one runbook.
- [x] Define five privacy-conscious beta metrics using existing first-party aggregate records, with seven-day cohorts and small-group suppression.
- [x] Rehearse the non-production release gate, deployed-shell smoke checks, and reversible rollback sequence.
- [x] Normalize email confirmation/reset redirects and remove duplicate Kakao scopes found during Preview authentication QA.

### P1: Public Beta Readiness

- [ ] Test iOS Safari and Android Chrome for upload, maps, navigation, modal behavior, and safe areas.
- [x] Make empty, loading, map-key, network, and upload-failure states actionable and non-sensitive.
- [x] Measure mobile loading and route transitions; set an image-size and loading budget. See `docs/performance/mobile-performance-budget-2026-07-26.md`.
- [x] Write a single incident runbook with Cloudflare/Supabase log paths, support contact, and rollback procedure.
- [x] Define privacy-conscious beta metrics: sign-up, first upload, first album, first publish, and Explore engagement.
- [x] Rehearse the production deployment, smoke test, and rollback path before public traffic.

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

1. Explicitly approve and deploy the signed-URL-compatible `dev` release to `main`, then make the shared `photos` bucket private and finish the three-account browser regression.
2. Run and record the first Free-plan encrypted export using the ready Colima runtime, then rehearse recovery against a disposable project before the next production data change. The export helper, tooling, and procedure are implemented.
3. Execute the account QA script in Cloudflare Preview. Photo lifecycle and Explore QA are complete.
4. Prepare the operating and legal copy, then run the production rehearsal.
5. Revisit leaked-password protection only when the Supabase plan is upgraded.

## References

- `docs/product/v2.1-current-scope-decision.md`
- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/product/operating-cost-estimate-2026-06-05.md`
- `docs/product/public-beta-privacy-and-support-draft-2026-07-24.md`
- `docs/product/public-beta-metrics-2026-07-26.md`
- `docs/qa/photo-lifecycle-preview-qa-2026-07-25.md`
- `docs/qa/authentication-preview-qa-2026-07-26.md`
- `docs/performance/mobile-performance-budget-2026-07-26.md`
- `docs/cloudflare.md`
- `docs/integrations.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
- `docs/operations/public-beta-release-rehearsal-2026-07-26.md`
