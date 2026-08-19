# Ikkyee Mobile Product Definition

## Status

- Prototype version: `v0.1.0`
- Intent status: approved for prototype implementation
- User visual approval: pending. This document records the approved intent, not fabricated design sign-off.

## Product Boundary

This is a mobile-only product direction for Ikkyee. It makes public, place-led discovery the first screen while preserving a compact private-photo workflow for the device owner.

The default destination is **Explore**. A user can discover public photos through a map, refine the map with search and scope, open a marker into a photo sheet, then continue into photo detail and social reactions. The product is not a feed and does not start with a promotional landing screen.

## Navigation

The fixed bottom navigation contains exactly these three tabs, in this order:

1. `Explore`
2. `내 사진`
3. `좋아요`

The top-right account control is a profile thumbnail of approximately 36px. In a signed-in state it opens profile and settings. In the guest state it opens the login path. The thumbnail remains available from every tab.

## Explore

- Launch on a map with public-photo markers and a compact search field.
- Let the user change photo scope and search for a place without leaving the map.
- Selecting a marker opens a photo bottom sheet with a clear path into detail.
- Photo detail supports author context, location, likes, comments, and a share action.
- Loading, empty, error, and offline states must be visible, not implied by missing content.
- Explore remains public and usable as a guest; a social action may reveal the login path.

## Guest And Profile

- Guests enter through the profile thumbnail, then can choose email, Google, or Kakao login.
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

- No mobile album UI, routes, creation, editing, grouping, or actions.
- No desktop breakpoints or production integration.
- No claim that the static prototype performs authentication, map search, uploads, or social writes against production services.
