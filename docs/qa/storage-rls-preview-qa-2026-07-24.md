# Storage And RLS Preview QA Record

**Date:** 2026-07-24

**Scope:** Read-only policy audit and anonymous Cloudflare Preview checks. No production bucket setting was changed.

## 2026-07-25 Cutover Readiness Recheck

- Supabase project `pqczcponriukilrtpbdl` is active and healthy.
- The shared `photos` bucket is still public.
- All 21 photo rows have `storage_path`; 6 are public and 15 are non-public.
- Storage policies still allow SELECT only for the object owner or a public/shared photo row. Insert, update, and delete remain owner-scoped.
- The Supabase security advisor reports only the known Free-plan leaked-password-protection warning. No new RLS warning was reported.
- `origin/dev` is at `3e69124`; `origin/main` is at `6dbc08e` and is 443 commits behind. The production client still calls `getPublicUrl()` and does not contain the signed-URL compatibility layer.
- Result: the privacy cutover is technically prepared on `dev` but blocked until an explicit production release. Changing the shared bucket now would break production image delivery.

## Results

| Scenario | Result | Evidence |
| --- | --- | --- |
| Public-table RLS baseline | Pass | RLS is enabled for `photos`, `albums`, `album_photos`, `profiles`, `user_likes`, `comments`, and `photo_private_locations`. |
| Photo row read policy | Pass for intended rule | The policy permits an owner or photos marked `public`/`link`/shared. |
| Storage signed-URL policy | Present | Storage SELECT policy allows an object owner or an object whose photo row is public. |
| Logged-out public Explore | Pass | An isolated logged-out browser opened `dev` Preview Explore and rendered public map pins and a public photo card. |
| Anonymous private-row read | Pass | An anonymous Data API request returned 0 private photo rows. |
| Anonymous public-row read | Pass | An anonymous Data API request returned all 6 currently public photo rows. |
| Anonymous private signed URL | Pass | A signed-URL request for a private object was rejected with HTTP 400. |
| Anonymous public signed URL | Pass | A signed-URL request for a public object succeeded with HTTP 200. |
| Logged-out direct private object URL | **Fail / expected before cutover** | A legacy public object URL for a private photo returned HTTP 200 because the `photos` bucket is still public. |
| Owner private-image rendering on `dev` | Pass before cutover | The signed-in owner library rendered 19 of 19 images from signed URLs; no library image used a legacy public URL. |
| Authenticated non-owner row/object denial | Pass at RLS level | An existing second user was simulated with the `authenticated` role and JWT subject. The owner's private photo row and matching Storage object both returned 0 visible records. |
| Authenticated owner row/object access | Pass at RLS level | The same private photo was queried as its owner; the photo row and matching Storage object both returned 1 visible record. |
| Non-owner browser image denial after cutover | Not run | Requires a second signed-in browser session after the bucket becomes private. |

## Current Security Finding

The database and Storage RLS policies behave as intended for anonymous access, authenticated owner access, authenticated non-owner denial, and signed-URL issuance. The authenticated checks used existing users in a rolled-back SQL transaction and did not create accounts, change passwords, or mutate application data. RLS cannot protect direct object URLs while `storage.buckets.public` remains `true` for `photos`. This is the known compatibility-rollout risk, not a new policy regression.

## Cutover Gate

Do not change the bucket to private until the signed-URL build is explicitly approved and deployed to `main`. The bucket is shared by `dev` and production; changing it early would break the currently deployed production application.

After `main` has the signed-URL build, run these checks in order:

1. Set `photos` to private in Supabase Storage.
2. Confirm a direct legacy URL for a private object no longer returns the object.
3. Sign in as the owner and verify private photo rendering, album rendering, and deletion.
4. Sign in as a different account and confirm private rows and signed URLs are denied.
5. Use a logged-out browser to confirm public Explore pins and public image rendering continue to work.
6. Record the tested commit, time, and result in Notion before treating the P0 gate as complete.

## References

- `docs/product/storage-private-transition-plan-2026-06-05.md`
- `docs/product/public-beta-launch-checklist-2026-07-22.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
