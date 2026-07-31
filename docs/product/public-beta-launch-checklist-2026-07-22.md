# Ikkyee Public Beta Launch Checklist

**Updated:** 2026-07-31

**Target:** Public beta (anyone can sign up, with a deliberately limited scope)  
**Product promise:** Choose photos, and a travel map is created.
**P0 progress:** 12 of 14 gates complete; 2 remain, including 1 paid-plan deferral.

## How To Use This Checklist

- The detailed working board lives in the Notion page **공개 베타 출시 작업**.
- This document is the version-controlled launch standard. Update it when a launch decision, risk, or gate changes.
- Every implementation task starts on `dev`, passes local verification, then is pushed to GitHub for the Cloudflare Preview deployment.
- Only explicitly approved, fully gated releases move from `dev` to `main`.

## Current Baseline

| Area | Status | Evidence |
| --- | --- | --- |
| Core product flow | Implemented | Home, upload, EXIF/location assignment, albums, Explore, public profiles, likes |
| Automated verification | Passing | `npm test`: 444 passing, 0 failing (2026-07-31) |
| Production build | Passing | `npm run build` (2026-07-31) |
| Preview delivery | Verified | Release candidate `ed19c3582b05` passed the repeatable shell, asset, config, and security-header rehearsal at `https://dev.practice-week1-cws.pages.dev`; `main` remains unchanged |
| Production delivery | Verified | GitHub `main` and `dev` synchronized at application release `a3030727e97f`; Cloudflare Production deployment and smoke verification passed on 2026-07-27 |
| Supabase RLS | Enabled | `photos`, `albums`, `album_photos`, `profiles`, `user_likes`, `comments` |
| Photo storage privacy | Private, passing | The `photos` bucket is private. Owner, non-owner, anonymous, signed-URL, legacy public-URL, and logged-out Production Explore checks passed. |
| Storage cutover verification | Passing | Live aggregate check: 0 photo rows missing `storage_path`, 4 Storage policies, 2 Auth accounts preserved. Disposable samples were retained because they were already compatible and useful as QA fixtures. |
| Public location privacy | Passing | Owner, non-owner, and anonymous role checks confirm approximate publication, hidden-location denial, and owner-only source coordinates. See `docs/qa/public-location-privacy-role-qa-2026-07-26.md`. |
| Public Explore QA | Passing | Logged-out pins, photo details, public profiles/albums, non-owner likes, and scope switching verified in Cloudflare Preview |
| Explore map search | Modernized | Deprecated `SearchBox` replaced with async Google Places `Autocomplete` integration |
| Browser response headers | Implemented | Cloudflare Pages Preview returns CSP, frame, content-type, referrer, and permissions headers |
| Authentication QA | Partial, P0 open | Physical mobile testing found an unreliable KakaoTalk app handoff. Mobile Kakao now stays in the browser, and the profile-choice marker survives cross-tab returns for 15 minutes. A device retest plus email links and remaining OAuth checks are still required. |
| Password safety | Deferred on Free | Supabase leaked-password protection requires a paid plan; revisit after a plan upgrade |
| Operations inventory | Cloudflare audit complete | Git/build/branch settings and environment key names were verified on 2026-07-25. The unused `SUPABASE_JWT_SECRET` and `MY_BUCKET` binding were removed without inspecting secret values or deleting the R2 bucket. |
| Database backup/PITR | Manual recovery rehearsed | The encrypted export and data-free schema baseline are verified. On 2026-07-27 the backup restored transactionally in an isolated local Supabase database with 7 tables, 24 policies, 1 trigger, and RLS on all 7 public tables. Storage binaries remain a separate recovery boundary. |

## Launch Gates

### P0: Release Blockers

- [x] Establish a passing automated-test and build baseline.
- [x] Approve the private-photo storage migration: private bucket, `storage_path`, signed URL policy, and rollback plan.
- [x] Backfill `photos.storage_path` for existing images while retaining compatibility with existing `url` values.
- [x] Add an RLS-controlled 15-minute signed URL resolver without exposing privileged credentials.
- [x] Move upload, image rendering, and deletion flows to the private-storage-compatible model.
- [x] Verify private files fail for logged-out and non-owner accounts, while public Explore remains visible.
- [x] Define and implement public location rules: exact, approximate, hidden, and unpublish/revoke behavior.
- [x] Run three-account RLS and Storage QA: owner, another signed-in user, and logged-out user.
- [ ] **Deferred while on Supabase Free:** enable leaked-password protection and confirm email sign-up behavior after upgrading to a paid plan.
- [x] Confirm the production environment inventory, secret ownership, backup/recovery steps, and migration rollback steps in the operator dashboard.
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
- [x] Verify public location privacy with owner, non-owner, and anonymous database roles without exposing coordinates or user identifiers.
- [x] Capture and automatically validate a secret-free, data-free live Supabase schema baseline for disaster recovery.
- [x] Restore the encrypted backup transactionally in an isolated local Supabase database and verify schema, RLS, policies, triggers, safe aggregates, and cleanup.
- [x] Classify all current pre-launch content as disposable sample data so Storage cutover work can use a clean reset and minimal fresh QA fixtures.
- [x] Revalidate the exact `dev` release candidate against the deployed Preview and record its commit, production distance, non-destructive boundary, and remaining gates.
- [x] Add a non-destructive private Storage preflight that validates signed-URL compatibility, aggregate live evidence, Git state, Preview smoke checks, tests, and build before cutover approval.
- [x] Fast-forward the approved signed-URL-compatible release to `main` and pass the Cloudflare Production smoke verification.
- [x] Make the shared `photos` bucket private and pass role, direct-URL, signed-URL, and logged-out Production Explore regression checks.
- [x] Revalidate Kakao Auth in Production and allow authenticated Kakao accounts without email to use upload and publish flows.
- [x] Persist one canonical Ikkyee profile across linked Google and Kakao identities so provider metadata cannot swap the visible profile.
- [x] Ask after Kakao OAuth whether to apply the Kakao name and avatar, with an explicit option to keep the current Ikkyee profile.
- [x] Keep mobile Kakao OAuth in the browser and preserve the one-time profile choice across app or tab handoffs.
- [x] Show a dedicated new-password form after a Supabase recovery callback and safely end the recovery session after success.

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

1. After any sample reset, upload one fresh GPS image and confirm map placement.
2. Upload one fresh image without GPS, choose a point on the map, and save it.
3. Add only the required fixtures to an album, edit a description, change visibility, delete a photo, then refresh.
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

1. [Complete] Deploy the signed-URL-compatible release to `main` and pass Production smoke verification.
2. [Complete] Keep the compatible disposable samples as QA fixtures, make the shared `photos` bucket private, and pass final access regression.
3. Run real-device email, Google, Kakao, upload, map, navigation, and modal QA on iOS Safari and Android Chrome.
4. Approve the final support address, retention policy, and legal copy before opening public traffic.
5. Revisit leaked-password protection only when the Supabase plan is upgraded.

## References

- `docs/product/v2.1-current-scope-decision.md`
- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/product/sample-data-reset-decision-2026-07-27.md`
- `docs/product/operating-cost-estimate-2026-06-05.md`
- `docs/product/public-beta-privacy-and-support-draft-2026-07-24.md`
- `docs/product/public-beta-metrics-2026-07-26.md`
- `docs/qa/photo-lifecycle-preview-qa-2026-07-25.md`
- `docs/qa/authentication-preview-qa-2026-07-26.md`
- `docs/qa/public-location-privacy-role-qa-2026-07-26.md`
- `docs/qa/private-storage-cutover-2026-07-28.md`
- `docs/performance/mobile-performance-budget-2026-07-26.md`
- `docs/cloudflare.md`
- `docs/integrations.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
- `docs/operations/public-beta-release-rehearsal-2026-07-26.md`
- `docs/operations/public-beta-release-candidate-2026-07-27.md`
- `docs/operations/public-beta-production-release-2026-07-27.md`
