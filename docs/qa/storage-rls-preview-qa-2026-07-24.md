# Storage And RLS Preview QA Record

**Date:** 2026-07-24

**Scope:** Read-only policy audit and anonymous Cloudflare Preview checks. No production bucket setting was changed.

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
| Non-owner private-image denial | Not run | Requires a second signed-in test account after the bucket becomes private. |

## Current Security Finding

The database and Storage RLS policies behave as intended for anonymous row reads and signed-URL issuance. They cannot protect direct object URLs while `storage.buckets.public` remains `true` for `photos`. This is the known compatibility-rollout risk, not a new policy regression.

## Cutover Gate

Do not change the bucket to private until the signed-URL build is explicitly approved for `main`. The bucket is shared by `dev` and production; changing it early could break the currently deployed production application.

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
