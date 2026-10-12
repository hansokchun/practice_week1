# Lessons Learned

## 2026-10-13: Keep Album Sharing On The Selected Cover

- A cover control must let the owner choose a member photo, not silently save the first item. Preserve the chosen photo when adding or removing unrelated album photos.
- Save only `cover_url` for a cover change; do not overwrite album text, visibility, or counts from an older modal snapshot.
- Sharing must resolve a saved cover path to a public album member under anonymous RLS. Never fetch an arbitrary cover URL or use a private photo as a public preview; fall back to a public member after a cover is removed or privatized.
- Version new share links and image URLs by the stable storage path, not by a short-lived signing token. Updating the site's metadata cannot rewrite a message already sent in a messenger.
- Persist canonical cover references without signing grants. Return a usable signed URL only to the current viewer and renew it on later reads; changing an album's visibility must not falsely mark individual photos public in local state.
- Reuse the normal photo renderer in the cover picker so lazy loading, decoding, and signed URL recovery remain available.

## 2026-10-12: Transparent Artwork And Visible Carousel Initialization

- Browser-forced dark themes can recolor CSS while keeping raster backgrounds light. Use real alpha for decorative artwork, not a baked-in canvas or multiply-only blending. Preserve artwork dimensions and edge masks; leave photo pixels untouched.
- A hidden SPA route has no useful carousel geometry. Initialize mobile centering only after a row has width, retry after cached route renders, and avoid resetting the user's later swipes. Temporarily disable smooth scrolling for the initial placement.
- Check direct home entry, landing-to-home navigation, viewport breakpoints, and both light/dark backing colors. A desktop Chrome viewport is not a physical Samsung Internet dark-mode test.

## 2026-10-12: Keep Optional Album Titles Separate From Display Labels

- Persist an absent album title as an empty string; use a display-only label in lists and an accessible, visually hidden heading in details. Creating, editing, and draft sharing must all preserve an intentionally empty input.
- Untitled albums must resolve their photos by album ID. Never match unassigned photos against an empty legacy album name, and restrict legacy name matching to the same owner.
- Constrain every nested grid in the album timeline with `min-width: 0`. Fit rounded thumbnail widths to the actual column so photos do not paint below the map.
- Editing a title must preserve the album description and the photo-story metadata.

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

## 2026-10-12: Administrator Accounts

- Admin routes must be added to both the app route set and the shared hash parser. Otherwise a direct URL or refresh silently falls back to Home even though menu navigation works.
- Never trust `user_metadata` for administration. Recheck the actor's current Auth `app_metadata` on the server and keep the account directory service-only.
- Auth bans alone do not protect against already-issued JWTs. Restrictive RLS covers reads/storage and write triggers also cover existing SECURITY DEFINER RPCs. Validate with synthetic users in a rollback transaction, never moderate real users for QA.
- Keep administrative previews limited to owned thumbnail/preview paths with short-lived signed URLs. Do not send original paths, raw Auth objects, or credentials to the browser.
- Invalidate pending admin responses on navigation, account switching, and role loss; never render data from an earlier actor.

## 2026-05-15

- Some Korean text appears broken in PowerShell output even when JSON parses correctly. Verify with Node or UTF-8-aware tools before assuming file corruption.
- Profile nickname writes and profile nickname reads must be designed together. Saving to `profiles` is not enough if public UI never reads that table.
- Fixed Back buttons can feel wrong in a multi-panel SPA. A small sidebar history stack is a better fit than hard-coded return destinations.
- Roll back behavior changes that are not verified in the real UI flow, even if pure helper tests pass. Sidebar Back needs a separate focused pass.
- For copy-to-map workflows, copy plain `lat,lng` rather than a decorated string. It is the smallest format that Google Maps search accepts directly.
- Nickname save failures can be caused by missing Supabase RLS policies even when the API project is active. Check `profiles` insert/update policies before changing persistence logic.
