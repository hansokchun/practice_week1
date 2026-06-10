# Travelgram / Ikkyee Stitch-First Product Plan

Date: 2026-05-28

## Direction

Travelgram / Ikkyee is a website for turning travel photos into a personal map archive. It should feel like a calm digital travel scrapbook: private by default, map-first when reviewing memories, and public only when the user intentionally shares.

This replaces the older planning priority. The Stitch project `Personal Travel Map Archive` is now the screen-flow and visual source of truth.

## Product Principles

- Web, not app: the first impression should be a website with clear pages/sections and shareable public views.
- Stitch first: page order, screen roles, visual hierarchy, color, spacing, and Korean copy should follow Stitch before older documents.
- Privacy first: uploads and albums default to private. Public exposure is a deliberate review step.
- Map as memory canvas: maps are not background decoration; they explain where travel happened.
- Keep working functions: reuse current upload, map, data, profile, route, and location-edit behavior where it fits.

## Target Information Architecture

| Route/section | Purpose | Stitch source |
| --- | --- | --- |
| `/` or `#home` | Website landing and value explanation | Home / Landing |
| `#myphoto` | Private photo/archive dashboard | My Photos Dashboard |
| `#upload` | Photo selection/upload workspace | Upload Before, Photo Upload Workspace, Upload Complete |
| `#album-review` | Analysis and location reconciliation | Album Analysis Review |
| `#review-map` or Myphoto album state | Private trip map review | Review Map |
| Detail overlay/panel | Photo inspection and editing | Photo Detail Modal |
| `#visibility` | Publication and share settings | 공개 설정 |
| `#explore` | Public map discovery | Explore Map, Selected Pin |
| Public trip view | Public album/trip story | Public Trip |
| Public profile view | Public author map/albums | Public Profile Map, Public Profile Albums |
| `/admin` | Internal content and data operations | Phase 2, not a public Stitch page |

## MVP Behavior

### Landing

- Show Travelgram / Ikkyee brand and navigation: Home, Myphoto, Explore.
- Hero copy: photos create a travel map.
- Primary CTA opens Myphoto/upload. Secondary CTA opens Explore.
- Include workflow cards, recent private album previews, public examples, and public photo preview grid.

### Myphoto

- Show private archive dashboard with upload and create-album actions.
- Surface task count for photos missing location.
- Show recent photos grouped by date and albums.
- Existing grid/map behavior remains usable.

### Upload

- Start from a photo selection page.
- Preserve existing file processing, compression, upload, EXIF date/location extraction, and missing-location picker.
- Add a pre-upload workspace later for selected-file preview and date range estimate.
- Upload complete screen should expose total/success/error/missing-location counts and next action.

### Review Map

- Show an album/trip map with day/date dividers.
- Reuse existing map markers, clustering, and route polyline.
- Provide edit, add photo, share, and privacy actions.

### Detail

- Keep existing edit location, delete, copy link/location, like/comment behavior as available capability.
- Visually simplify toward Stitch modal/side-panel language.
- For public selected pins, prefer public album/profile actions over private editing actions.

### Visibility

- Start with current private/public toggle.
- Extend to album-level publication settings: private, link sharing, public.
- Add location/time exposure controls as planned data fields before exposing them as real persistence.

### Public Views

- Explore shows public map discovery and selected-pin sidebar.
- Public Trip shows a public album route with day timeline, author, and related albums.
- Public Profile supports map tab and album tab.

## Phase 2 Admin Website

The admin website is needed, but it should not interrupt the Stitch-first public/user website MVP. Treat it as a small internal website added after the main user flow is recognizable and working.

Admin goals:

- Review users, photos, albums, and public profile data.
- Hide or unpublish public photos/albums when needed.
- Inspect reports, moderation state, and visibility settings.
- Confirm database records, upload results, and missing-location queues during development.
- Show basic service metrics: upload count, album count, public/private count, and recent activity.

Admin scope:

- Route: `/admin` or `#admin`.
- Access: admin-only. Never expose it in normal public navigation.
- MVP admin screens: dashboard, users list, photo/album list, public content review, reports/moderation queue, data health check.
- Defer advanced analytics, billing, role management, and automated moderation until after public sharing has real usage.

## Data Model Needs

Current photo fields are enough for the first Stitch alignment: `id`, `url`, `date`, `description`, `lat`, `lng`, `album`, `shared`, `owner_id`.

Likely additions:

- `albums`: name, cover photo, owner, date range, visibility, share token.
- `album_photos`: album/photo ordering and day grouping.
- `visibility_settings`: location precision, time precision, EXIF stripping/download policy.
- `upload_sessions`: selected count, success/error counts, missing-location queue.
- Optional `gpx_tracks`: uploaded GPX files and photo matching results.
- Phase 2 admin/moderation: `reports`, `moderation_actions`, `admin_audit_logs`, and optional `user_roles`.

## Current Code Decision

- Keep `dev` branch as checkpoint.
- Continue from current local code only after approval.
- Do not preserve current layout if it conflicts with Stitch.
- Preserve functional modules wherever possible: upload, map render, auth/data, profile, detail editing.

## Acceptance Criteria

- A user can understand the site as a photo-to-map archive website from the first screen.
- The primary flow from landing to Myphoto to upload to review map is coherent.
- Private/public states are visible and quiet, not alarm-like.
- Existing upload/map/photo data behavior still works after redesign.
- Public trip/profile/explore pages are recognizable from Stitch even if advanced data remains mocked or progressive.
- Admin website is documented as Phase 2 and does not appear in the public website navigation.
