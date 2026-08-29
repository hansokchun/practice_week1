# Ikkyee Mobile Product Definition

## Status

- Prototype version: `v0.1.0`
- Intent status: approved for prototype implementation
- User visual approval: pending. This document records the approved intent, not fabricated design sign-off.

## Product Boundary

This is the native mobile surface of the same Ikkyee service. It shares Supabase Auth, profiles, public photos, landing curation, comments, and likes with the web while preserving a private device-photo workflow for the device owner.

The default destination is the public-photo **landing** shared with the web information architecture. A user searches curated public-photo rows, opens a photo detail, or continues to the Explore map. The landing is available before login.

## Navigation

There is no fixed bottom navigation. The landing header contains the Ikkyee logo, `사진 추가`, and login/account controls. Signed-in account navigation contains `내 프로필`, `내 사진`, and `좋아요한 사진`. Explore remains available through two explicit map entry points on the landing.

## Explore

- Guests enter the map on other users' public photos. Signed-in users enter on `내 사진` and the camera fits every owned located photo.
- `내 사진` uses owner-only `photo_private_locations`, so private and public photos can appear for their owner. `다른 사람 사진` remains restricted to public exact or approximate locations.
- Let the user change photo scope and search for a place without leaving the map.
- Selecting a cluster animates to a padded split viewport; identical coordinates remain selectable by cycling.
- Selecting a marker opens a photo preview with a clear path into detail.
- Photo detail uses a heart-only like control, `-- --` for a missing date, owner-only visibility copy, an Explore map handoff, comments, and safety actions behind the title-row menu.
- Exact public locations may open Google Maps panorama through an external Street View URL. Hidden and approximate locations never open Street View.
- Loading, empty, error, and offline states must be visible, not implied by missing content.
- Explore remains public and usable as a guest; a social action may reveal the login path.

## Guest And Profile

- Guests enter through the login control, then choose email, Google, or Kakao without developer or upload-limit copy in the sign-in UI.
- Accounts without a custom avatar use the shared Ikkyee pin-and-leaf default image in headers, profiles, and photo attribution.
- The signed-in profile surface is small and practical: profile summary, settings, and sign-out affordance.
- The prototype may switch between guest and signed-in presentation locally, but it does not claim real authentication.

## Personal Photos

`내 사진` is a secondary device-photo workflow, not the home destination.

- Show a compact personal photo grid and map toggle.
- Show a clear missing-location cue when a photo needs correction.
- Location correction uses a focused map selection step and explicit confirmation.
- Publication is confirmed in a separate confirmation state before a public map marker appears.

## Likes

- `좋아요` collects public photos saved by the user.
- It supports an empty state and opens the same photo detail flow as Explore.

## Explicit Exclusions

- The first mobile beta has no album UI, routes, creation, editing, grouping, or actions. Shared web albums and future AI-created albums remain a post-beta parity phase rather than an accidental partial implementation.
- No desktop breakpoints.
- No native embedded Street View renderer in the first beta; exact locations use the supported external panorama handoff until a privacy-reviewed native integration is approved.
