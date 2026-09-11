# Photo Loading and Main Page Audit

Date: 2026-09-12

## Production blocker

- The public Supabase REST API returned HTTP 402 with `exceed_egress_quota`.
- The organization is on the Free plan. No billing or spend-cap settings were changed.
- Database health was ACTIVE_HEALTHY; the failure is not evidence of deleted photos.
- Aggregate inspection found 138 photos (137 public): 73 with thumbnails and 65 without.
- Original objects average about 1.86 MB; thumbnail objects average about 116 KB.
- Service restoration requires the quota restriction to clear, or an owner-approved plan change. Frontend deployment alone cannot restore the restricted API.

## Changes

- Do not load originals while an existing thumbnail is awaiting a fresh signed URL.
- Preserve valid signed URLs across metadata refreshes, but never across owner, visibility, or storage-path changes.
- Refresh paginated thumbnail URLs together with original URLs.
- Ignore detached image elements in recovery batches and stop a failed signing batch explicitly.
- Do not preload the intro slideshow's original photos behind the main page.
- Fetch main curation and library metadata concurrently; preserve unchanged photo rows.
- Distinguish pending, failed, and truly empty results. Retry refreshes both metadata and curation.
- Reduce main-page blank space, align section titles and actions, restore the mobile Korean brand label, and simplify the footer.

## Verification

- `npm test`: 769 passed, 0 failed.
- `npm run build`: passed.
- Desktop 1440px and mobile 390px browser viewport checks: photo layout, horizontal overflow, carousel endpoint, 44px mobile whole-view action, banner and footer.
- Isolated local fixture (not deployed): first desktop row requested five thumbnails and zero originals. This does not assert production speed while the API is restricted.
- Real restricted API: one service-unavailable state; retry returns through loading to the failure state.
- No physical iPhone Safari or Android Chrome testing was performed in this audit.

## Follow-up after service restoration

- Generate the 65 missing thumbnails and verify their persisted paths. Existing owner-only desktop backfill was not run during the restriction.
- Recheck production image timing on a cold cache and a repeat visit, including photo detail and pagination.
- Monitor egress in Supabase usage before inviting more users. No paid image-transform API was introduced.

Official references:

- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/platform/billing-faq
