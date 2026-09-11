# Photo delivery remediation (2026-09-12)

## Diagnosis

- Supabase public REST still returns HTTP 402 `exceed_egress_quota`.
- 138 photos: 73 existing thumbnails and 65 missing thumbnails.
- Main curation contains 29 distinct photos. The 11 missing-thumbnail originals
  account for approximately 93% of the 28,134,750 bytes for these rows.
- Five configured hero originals total 8,402,880 bytes. Three have no thumbnail.
- These are object-size estimates, not a claim that every visit downloads all
  rows. Viewport, scrolling, slideshow duration and cache affect actual transfer.

## Changes

- Main cards use a thumbnail or bounded preview, never an automatic original
  fallback. Missing derivatives display `사진 준비 중`; detail clicks still
  open the actual photo rather than an unrelated sample.
- Hero slides use previews (thumbnail fallback) and initially warm only the
  current and next slides. Unprepared slides are omitted until prepared.
- New web uploads require a thumbnail. An additional JPEG preview targets a
  maximum 1920px long edge and 450 KiB; a thumbnail remains the fallback if no
  preview can be encoded within that budget. Original photos are retained.
- Removed automatic original-download thumbnail backfill during visits.
- Settings provides explicit owner-only preparation, at most three photos per
  click, prioritizing curated photos and stopping on the first failure.
- Added `photos.preview_path`, URL signing and derivative cleanup for web
  deletions/upload rollback. Storage SELECT policy retains existing owner and
  public-photo boundaries for previews. Migration applied remotely.

## Verification

- Node tests: 776 passing at implementation verification; final release reruns
  the complete suite and Vite build.
- Local browser fixture, initial hero load: two preview requests, zero original
  requests. Subsequent slides load as they approach the active position.
- Desktop and 390px mobile main/hero checks use local fixture images so QA does
  not add transfer against the restricted production project.
- Local fixture bytes are not used to claim production compression ratios.
- Existing advisor warnings about `set_photo_like` and leaked-password
  protection are unrelated to this change and were not modified.

## Remaining blocker and next steps

- Production service restriction is NOT resolved by this deployment. No paid
  plan, billing or quota settings were changed.
- Existing original photos were NOT downloaded/converted during the restriction.
  After restoration, 11 curated main photos can remain pending and three hero
  photos can remain omitted until their derivatives are generated.
- Once normal API access returns, use Settings > 사진 최적화 for the owner's
  existing photos, then verify actual main/hero transfer on a cold browser load.
  Other owners prepare their own originals; this tool does not bypass RLS.
- Native app conversion and native deletion cleanup are outside this web change.
