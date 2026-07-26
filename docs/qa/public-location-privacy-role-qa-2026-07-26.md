# Public Location Privacy Role QA

**Date:** 2026-07-26  
**Environment:** Supabase project `pqczcponriukilrtpbdl` and Cloudflare `dev`  
**Status:** Pass at database-role and policy level

## Scope

This was a read-only verification. It did not output user IDs, coordinates, object paths, emails, or private photo data. Existing accounts were represented only as owner, another authenticated user, and anonymous roles.

## Results

| Scenario | Result | Aggregate evidence |
| --- | --- | --- |
| RLS baseline | Pass | RLS is enabled on `photos` and `photo_private_locations`. |
| Current data classification | Pass | 21 photos: 6 public/approximate and 15 private/hidden. |
| Private source integrity | Pass | 18 owner-only source rows, 0 orphan rows, and 0 owner mismatches. |
| Approximate publication | Pass | 0 approximate rows matched their private source coordinates exactly. |
| Anonymous access | Pass | 6 public/approximate photos visible; 0 private photos, hidden locations, hidden coordinates, or private source rows visible. |
| Authenticated non-owner | Pass | The target owner's 5 public photos were visible; 0 target private photos and 0 target private source rows were visible. |
| Authenticated owner | Pass | The owner could read 19 owned photos and 17 owned private source rows; 0 other-owner private photos were visible. |
| Publication trigger | Pass | Public/link hidden locations become null, approximate locations round the private source to two decimal places, and exact publication uses the private source. |

## Residual Notes

Twelve private/hidden legacy photo rows still retain owner-visible coordinates in `photos`. They were not visible to anonymous or non-owner roles, and the publication trigger removes or transforms them before public/link exposure. The canonical private source remains `photo_private_locations`.

The live location table, policies, and trigger are not fully represented in the repository migration history; only the later deferred foreign-key adjustment is currently present. This does not weaken the live RLS result, but it means a fresh project cannot yet reconstruct the complete schema from `supabase/migrations` alone. Capture and validate a live schema baseline during the disposable-project restore rehearsal.

## Decision

The checklist baseline **Public location privacy** passes for current live data and database roles. The separate private Storage cutover and post-cutover browser regression remain open.

