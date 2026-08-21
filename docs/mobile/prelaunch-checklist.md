# Ikkyee Mobile Prelaunch Checklist

**Created:** 2026-08-21  
**Release target:** First public iOS and Android beta  
**Current stage:** Foundation and prototype; production integration has not started

## Checklist Policy

- This is the fixed mobile release ledger. Do not delete or renumber an item after it is added.
- Complete work by changing `[ ]` to `[x]` and adding a dated evidence link or command result.
- Keep deferred work unchecked and label it `Deferred`; a deferral is not a completion.
- Append newly discovered release requirements to the end of the relevant section.
- The mobile app remains album-free. Web album and future web AI-album work do not expand mobile scope without a separate product decision.

## 1. Product And Release Decisions

- [x] Define Explore as the default destination and fix the bottom navigation to Explore, 내 사진, 좋아요. Evidence: `docs/mobile/product-definition.md`.
- [x] Keep album creation, editing, listing, and sharing out of the mobile app. Evidence: `docs/mobile/product-definition.md` and `mobile/src/backend-policy-contract.json`.
- [x] Define the first-release native media and privacy boundary. Evidence: `docs/mobile/adr/0001-native-media-boundary.md` and `docs/mobile/privacy-media-policy.md`.
- [ ] Approve the production mobile visual direction on physical iPhone and Android screens.
- [ ] Choose the first distribution target: TestFlight/Internal testing, closed beta, or public stores.
- [ ] Confirm minimum supported OS versions and device classes.
- [ ] Assign the release owner, incident contact, and monitored public support email.
- [ ] Approve the mobile privacy notice, account-deletion instructions, and data-retention wording.

## 2. Project Foundation

- [x] Create the Expo Router application scaffold and lock dependencies. Evidence: `mobile/package.json` and `mobile/package-lock.json`.
- [x] Add TypeScript, lint, Jest, schema verification, export, Maestro, and Supabase scripts. Evidence: `mobile/package.json`.
- [x] Add an environment-variable example without secrets. Evidence: `mobile/.env.example`.
- [x] Add initial Expo and EAS configuration files. Evidence: `mobile/app.json` and `mobile/eas.json`.
- [ ] Confirm the final iOS bundle identifier and Android package name in Apple, Google, and Expo accounts.
- [ ] Register and verify the final custom URL scheme and universal/app links.
- [ ] Add environment separation for local, preview, and production Supabase configuration.
- [ ] Configure secret storage in EAS; no service-role key or provider secret may enter the client bundle.
- [ ] Produce reproducible iOS and Android development builds from a clean checkout.

## 3. Design And Navigation

- [x] Document mobile tokens, responsive constraints, accessibility rules, and interaction primitives. Evidence: `docs/mobile/DESIGN.md`.
- [x] Build a clickable static product prototype. Evidence: `docs/mobile/prototype/index.html`.
- [x] Render the initial native Explore shell with a profile control and three-tab navigation. Evidence: `mobile/app/index.tsx`.
- [ ] Replace the single-screen shell with production routes for Explore, 내 사진, 좋아요, profile, auth, photo detail, location edit, and publish confirmation.
- [ ] Implement loading, empty, offline, permission-denied, and recoverable error states for every route.
- [ ] Verify 360px and 390px widths, safe areas, keyboard avoidance, screen rotation policy, and text scaling.
- [ ] Complete screen-reader labels, focus order, contrast, reduced motion, and 44px minimum hit-area QA.
- [ ] Replace prototype-only artwork and controls with production assets and licensed store-safe resources.

## 4. Device Photo Library And Local Data

- [x] Define iOS and Android media permission/capability behavior. Evidence: `mobile/src/native-media-capabilities.json`.
- [x] Define the local photo domain, sync states, tombstones, and publication jobs. Evidence: `mobile/src/local-photo-domain.json`.
- [x] Implement and test the SQLite schema and migration runner. Evidence: `mobile/src/local-photo-database.ts` and `mobile/src/local-schema-migrations.json`.
- [x] Define local recovery behavior for interrupted scans and publication jobs. Evidence: `mobile/src/local-photo-recovery.ts`.
- [ ] Open the real system photo permission flow and handle full, limited, denied, and changed permissions.
- [ ] Scan MediaLibrary incrementally and reconcile added, modified, and deleted device assets.
- [ ] Persist real asset metadata through the SQLite repository from application routes.
- [ ] Generate bounded thumbnails/cache entries and enforce cache cleanup and backup exclusion.
- [ ] Read EXIF capture time and location safely, including missing/invalid metadata and Live Photos.
- [ ] Verify large-library behavior with at least 1,000 and 10,000 assets on physical devices.
- [ ] Verify database migration, corruption recovery, interrupted scan recovery, and app reinstall behavior.

## 5. Authentication And Shared Backend

- [x] Record the read-only Supabase schema, RLS, Storage, and web-only album boundary. Evidence: `docs/mobile/backend-contract.md`.
- [x] Add a local Supabase configuration for contract testing. Evidence: `supabase/config.toml`.
- [ ] Install and configure the production Supabase client in the mobile app.
- [ ] Implement session persistence, expiry, refresh, logout, and signed-out recovery.
- [ ] Implement email sign-up, verification, login, password reset, and account linking.
- [ ] Implement Google OAuth on iOS and Android with production redirect allow-lists.
- [ ] Implement Kakao OAuth on iOS and Android with production redirect allow-lists.
- [ ] Verify one canonical Ikkyee profile across email, Google, and Kakao identities.
- [ ] Implement profile name/avatar editing and the shared default-avatar behavior.
- [ ] Re-run owner, another-user, and anonymous RLS/Storage tests from the mobile client.
- [ ] Verify signed URL expiry, refresh, offline handling, and private-object denial.

## 6. Explore

- [ ] Connect a production map SDK and keys restricted to the final iOS/Android application identifiers.
- [ ] Load public photos for the visible map region with pagination and request cancellation.
- [ ] Implement stable marker clustering, selected-marker state, and viewport preservation.
- [ ] Implement place search and public-photo scope controls.
- [ ] Implement the photo preview sheet and full photo detail route.
- [ ] Implement author profile navigation without exposing private profile or location data.
- [ ] Verify hidden/approximate/exact public-location behavior against production policies.
- [ ] Add offline, no-results, map-key, quota, and network recovery states.
- [ ] Measure map startup, pan/zoom responsiveness, memory, and battery use on low/mid-range devices.

## 7. My Photos And Publication

- [ ] Render the device photo grid from the real local repository.
- [ ] Render located device photos on the private local map.
- [ ] Implement photo detail with original metadata and a clear local/cloud state.
- [ ] Implement missing-location detection and manual map correction.
- [ ] Implement explicit photo selection for private cloud save, link sharing, or public publishing.
- [ ] Resize/compress a publication derivative without mutating the device original.
- [ ] Strip or limit metadata according to the approved privacy policy.
- [ ] Upload only after explicit confirmation and persist a retryable publication job.
- [ ] Handle cancellation, background interruption, duplicate submissions, and partial failures safely.
- [ ] Verify unpublish, deletion, app reinstall, and device-original deletion behavior.
- [ ] Confirm that no mobile code creates, reads, updates, or deletes albums.

## 8. Likes, Comments, Sharing, Safety, And Profile

- [ ] Implement liked-photo loading, optimistic like/unlike, rollback, and empty state.
- [ ] Implement comments with loading, write failure, deletion, and abuse-safe limits.
- [ ] Implement native link sharing and verify received links reopen the correct public surface.
- [ ] Implement report and block flows with a documented operator response path.
- [ ] Implement signed-in profile, settings, logout, and public-photo summary.
- [ ] Implement account deletion request/confirmation and verify backend cleanup obligations.
- [ ] Remove or hide deleted/private content from likes, comments, links, and cached screens.

## 9. Quality, Security, And Operations

- [ ] Make `npm run lint`, `npm run typecheck`, `npm test`, and `npm run schema:verify` pass from `mobile/` in CI.
- [ ] Add integration tests for auth, media permission, local scan, publish, Explore, likes, and deletion.
- [ ] Run Maestro smoke tests on iOS and Android build artifacts.
- [ ] Verify no secret, personal test data, precise location fixture, or private photo is committed or logged.
- [ ] Add privacy-safe crash reporting and release diagnostics after provider approval.
- [ ] Define API, map, Storage, image traffic, and active-user cost alerts.
- [ ] Document mobile incident triage, rollback, forced-upgrade, and backend compatibility procedures.
- [ ] Verify app startup, memory, storage, network, image, and battery budgets.
- [ ] Complete physical-device QA on at least one supported iPhone and two Android tiers.
- [ ] Complete a security/privacy review of auth redirects, local data, logs, links, RLS, and Storage.
- [ ] Resolve or formally assess the Expo/Metro production dependency advisories without applying the breaking Expo 57 to 53 audit downgrade.

## 10. Store And Release

- [ ] Finalize app name, icon, adaptive icon, splash screen, screenshots, and store descriptions.
- [ ] Publish working privacy-policy, support, and account-deletion URLs.
- [ ] Complete Apple privacy nutrition labels and Google Play Data safety declarations.
- [ ] Complete content rating, age rating, export compliance, and required tester/account disclosures.
- [ ] Configure signing credentials, build numbers, semantic version, and release channels.
- [ ] Pass TestFlight and Play Internal Testing installation, upgrade, deep-link, and login QA.
- [ ] Freeze the release candidate and record source commit, backend schema compatibility, and rollback point.
- [ ] Obtain explicit production-release approval.
- [ ] Submit iOS and Android builds and resolve review findings.
- [ ] Run post-release smoke checks and begin crash, auth, map, Storage, and cost monitoring.

## Current Assessment

The repository has a strong specification, privacy boundary, backend contract, local domain, SQLite foundation, static prototype, and first native Explore shell. It does not yet have production authentication, map data, device-library wiring, publication, social writes, account management, store assets, signed builds, or physical-device release evidence. Treat the current app as an early engineering foundation, not a beta release candidate.

## Verification Log

### 2026-08-21

- Web `npm test`: 489 passed, 0 failed.
- Web `npm run perf:budget`: passed.
- Mobile `npm run typecheck`: passed.
- Mobile `npm run lint`: passed.
- Mobile `npm run schema:verify`: fresh, upgrade, corruption recovery, and invalid-migration rejection passed.
- Mobile `npm run export:all`: iOS, Android, and Web bundles exported successfully.
- Mobile `npm test`: 45 passed and 2 failed. Both failures require the missing sanitized live-backend evidence file at `.omo/evidence/task-5/backend/live/catalog-sanitized.json`; do not mark the CI gate complete until reproducible sanitized evidence is restored or the evidence contract is deliberately revised.
- Mobile `npm audit --omit=dev`: 15 transitive advisories (8 high, 7 moderate). The suggested forced fix downgrades Expo 57 to 53 and was intentionally not applied.
