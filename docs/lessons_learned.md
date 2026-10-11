# Lessons Learned

## 2026-10-12: Separate Album Loading From Empty Results

- Do not render the public empty-album shell until both photo and album metadata have finished loading. Album route entry happens before the initial library request completes.
- Album details need distinct loading, retryable failure, and genuinely empty states using the current layout. Verify a real refresh transitions from loading to the album without exposing the old static public-trip markup.

## 2026-10-12: Preserve Recoverable Album Thumbnails

- Album covers and album-detail thumbnails must retain their photo ID and use the shared image renderer. A raw signed cover URL cannot be renewed after its 15-minute lifetime.
- Listen for later loads even when an image was initially complete. Track listeners per DOM node, not through copied dataset attributes, and keep a nonzero frame while an unsigned masonry image waits.
- Recheck visible photos on route/tab entry, foreground return, online recovery, and back-forward cache restoration. Share in-flight signing batches and bound transient retries; do not retry permission failures automatically.
- Ignore signing responses after the account, file paths, ownership, or visibility changes. Verify cached failures and connection recovery in both desktop and mobile browser fixtures without modifying server photos.

## 2026-10-11: Keep Thumbnail Recovery Listening

- `img.complete` is also true for images without a source and cached failures. It is not a success signal without positive `naturalWidth`.
- Grid reveal listeners must survive late signed URLs and fallback loads; otherwise a healthy recovered image retains the hidden thumbnail error state.
- Selection-only updates must preserve existing image nodes, decoded pixels, and pending requests instead of replacing the entire personal grid.
- The shared reveal observer must recover cached failures whose original error event was missed. Verify delayed URLs, cached errors, pagination, and selection together.

## 2026-10-11

- In the height-constrained photo-detail sidebar, use content-sized grid rows for both the sidebar and Street View. Auto rows can shrink a `min-height: 0` Street View section below its image, painting the preview over map actions and the map. Verify short desktop viewports as well as mobile scrolling.
- Kakao's desktop share SDK posts a form to `sharer.kakao.com`. Loading the SDK is not enough: CSP must permit that exact form destination and its account-login redirect. Keep other form destinations blocked and verify the deployed popup, not just the click handler.
- Prepare sharing SDKs before enabling their buttons. Call the share API directly from the user click and remove failed script elements before retrying; otherwise a completed error event can leave later attempts waiting forever.

## 2026-05-15

- Some Korean text appears broken in PowerShell output even when JSON parses correctly. Verify with Node or UTF-8-aware tools before assuming file corruption.
- Profile nickname writes and profile nickname reads must be designed together. Saving to `profiles` is not enough if public UI never reads that table.
- Fixed Back buttons can feel wrong in a multi-panel SPA. A small sidebar history stack is a better fit than hard-coded return destinations.
- Roll back behavior changes that are not verified in the real UI flow, even if pure helper tests pass. Sidebar Back needs a separate focused pass.
- For copy-to-map workflows, copy plain `lat,lng` rather than a decorated string. It is the smallest format that Google Maps search accepts directly.
- Nickname save failures can be caused by missing Supabase RLS policies even when the API project is active. Check `profiles` insert/update policies before changing persistence logic.
