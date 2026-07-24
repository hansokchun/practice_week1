# Photo Lifecycle Preview QA

**Date:** 2026-07-25  
**Environment:** Cloudflare Pages `dev` Preview  
**Account:** Authenticated owner QA

## Result

| Scenario | Result | Evidence |
| --- | --- | --- |
| GPS upload | Pass | EXIF coordinates `37.55, 126.983333333333` persisted with `geo_source=exif`. |
| Private source location | Pass | Exact coordinates persisted in `photo_private_locations`; the new photo defaulted to `location_precision=hidden`. |
| Upload transaction recovery | Pass | The location trigger foreign key is deferred; failed DB writes now remove the current Storage object and compensate earlier batch writes. |
| No-GPS upload | Pass | Photos persisted with null coordinates and appeared in the missing-location task list. |
| Manual location | Pass | Map selection persisted with `geo_source=manual`. |
| Description edit | Pass | `QA lifecycle 2026-07-25` persisted and rendered after navigation. |
| Public location precision | Pass | Source `33.450701, 126.570667` remained owner-only while the public row exposed rounded `33.45, 126.57`. |
| Visibility change | Pass | Photo changed from private to public and returned to private successfully. |
| Album assignment | Pass | A private QA album and ordered `album_photos` link were created. |
| Refresh recovery | Pass | The album route, title, and linked photo restored after a full Preview reload. |
| Delete and cleanup | Pass | QA album, three QA photos, their Storage objects, and the initial failed-upload orphan were removed. |

## Verification

- `npm test`: 390 passing, 0 failing.
- `npm run build`: passing.
- GitHub `dev` commit `d06df77` deployed to the Cloudflare Preview alias.
- Supabase API and Postgres logs confirmed the original failure was the immediate `photo_private_locations_photo_id_fkey` check inside the `BEFORE INSERT` privacy trigger.

## Remaining Boundary

This verifies the authenticated owner lifecycle. The separate three-account gate still covers private Storage and RLS access from another signed-in account and a logged-out browser.
