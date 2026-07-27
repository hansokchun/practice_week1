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

The incremental migration history still does not contain the original creation of every live object. A secret-free and data-free full baseline is captured in `supabase/schema.sql`, including the location table, policies, trigger, grants, and RLS state. The 2026-07-27 isolated restore rehearsal confirmed that the backup reconstructs all 7 public tables, 24 policies, the publication trigger, and RLS on every public table.

## Decision

The checklist baseline **Public location privacy** passes for current live data and database roles. The separate private Storage cutover and post-cutover browser regression remain open.
