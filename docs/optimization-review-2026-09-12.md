# Service optimization review: 2026-09-12

## Scope

Reviewed web startup and photo hydration, upload derivatives, map clustering,
Cloudflare photo analysis, native photo repositories and screen refresh,
build budgets, and hosted database performance/security advisors.
This is a measured optimization pass, not a claim that every future scaling
issue or every authenticated device workflow has been verified.

## Implemented

- Web upload optimization and thumbnail creation close decoded ImageBitmaps on
  success, early return, and failure. Preview creation already did so.
- Map clustering uses neighboring spatial cells instead of scanning all existing
  clusters for every photo. Original first-match order and moving centroids are
  preserved, including relocation between cells. Coordinates are not modified.
- AI analysis prefers the prepared preview, then thumbnail, then legacy original.
  Completed analyses remain cached. Downloads are cancelled beyond 4 MiB even
  when the response omits Content-Length.
- AI work is claimed through a conditional owner-scoped PATCH. A competing
  request cannot run another analysis for the same claim; stale attempts cannot
  overwrite a newer attempt. Quota lookup failures do not mark unclaimed photos
  as failed. Different-photo daily quota reservation is not yet transactional.
- Native main content fetches administrator-assigned photo IDs in batches of
  100 instead of retrieving the latest 200 uploads and discarding most of them.
  This also restores older curated photos. Empty selections skip photo queries.
- Native main, map, profile, likes, and album lists prefer prepared previews over
  originals when a thumbnail is absent. Signed paths on main are deduplicated.
- Native main uses virtualized horizontal photo lists (initial three items,
  bounded batches). Its redundant refresh timer was removed; the existing
  foreground/focus-aware refresh hook remains responsible for expiration.
- The web dev server ignores the separate mobile project. Native exports had
  been triggering repeated web reloads and backend reads during development.

## Evidence

- Web tests: 797 passing; Vite production build passes.
- Native tests: 370 passing across 100 suites before final export verification;
  typecheck, lint, all-platform export, security and performance checks run.
- Synthetic map benchmark, five runs averaged, zoom 12, same seeded coordinates:
  1,000 photos: 12.74 ms -> 1.86 ms; 5,000 photos: 239.20 ms -> 8.89 ms.
  These are local calculation times, not real-device rendering/frame-rate claims.
- Cluster equivalence tests cover dense/sparse distributions, zoom 3/7/12/18,
  radii 0/54/90, original expansion tests, and non-finite input protection.
- Desktop 1280px and mobile 390px local-fixture browser checks: no horizontal page
  overflow; photo loading, row navigation, detail opening/closing verified.
  Fixtures use local images and do not imply hosted OAuth or real-device QA.
- Hosted REST minimum read returned HTTP 200 during this pass, rather than the
  previously observed quota HTTP 402. This alone does not certify all Storage
  objects or the organization's billing state.

## Remaining work and explicit limits

- Hosted aggregate: 138 photos, 73 thumbnail paths, zero preview paths.
  The 65 missing thumbnails require a one-time derivative preparation job.
  No bulk original downloads, paid-plan upgrades, or real photo AI jobs were run.
- Web aggregate JavaScript Brotli remains above its existing budget:
  71.44 KiB versus 70.5 KiB (baseline 71.26 KiB). The spatial index adds a small
  amount of code in exchange for substantially less runtime work. The budget
  check still fails; its threshold was not raised or disabled. CSS and image
  budgets pass. A tested alternative minifier offered no meaningful benefit and
  was removed, leaving dependencies unchanged.
- Web still loads the visible photo metadata library at startup. Server-side
  pagination/search and viewport-based map metadata should be introduced before
  scaling beyond the API row limit; this requires coordinated route/data changes,
  not truncating photo lists or weakening visibility checks.
- Native legacy photos without derivatives still use original images as fallback.
  Real-device memory, upload, OAuth return, and long-list scrolling remain to be
  checked on hardware. App store/tester binaries were not published in this pass.
- Hosted performance advisor reports 12 unused indexes, not a critical query
  warning. They were retained because recent/reset usage statistics do not prove
  indexes serving security or low-frequency operations are unnecessary.
- Security advisor flags the authenticated `set_photo_like` SECURITY DEFINER RPC
  and disabled leaked-password protection. The RPC intentionally checks auth.uid
  and photo visibility before mutations; it was not disabled. Auth plan/settings
  were not changed.

## References

- [Conditional REST filters and updates](https://docs.postgrest.org/en/stable/references/api/tables_views.html)
- [Unused-index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Authenticated definer-function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
