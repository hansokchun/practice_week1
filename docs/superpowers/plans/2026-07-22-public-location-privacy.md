# Public Location Privacy

**Implemented:** 2026-07-22  
**Scope:** Public photo locations in Explore, public profiles, and shared public albums.

## Policy

- `exact`: the owner explicitly permits the saved coordinate to appear on public maps.
- `approximate`: the public map receives coordinates rounded to two decimal places, roughly a 1 km area rather than the original capture point.
- `hidden`: no public map coordinate exists and the photo receives no Explore pin.
- Private and link/public visibility changes preserve the owner's original coordinate separately. Revoking public visibility removes the row from public map queries immediately through the existing RLS visibility policy.

## Data Boundary

- `public.photos.lat` and `public.photos.lng` now contain only the public-safe coordinate when a photo is publicly visible.
- `public.photo_private_locations` contains original coordinates and is protected by owner-only RLS policies.
- A database trigger stores original coordinates and rewrites the public values on every photo insert or update. This prevents an approximate or hidden setting from being bypassed by a client-side request.

## Migration Result

- Backfilled 18 existing original location rows into the private table.
- Converted 6 existing public photo coordinates to `approximate` values.
- Assigned `hidden` to the remaining private photos.
- Verified all 6 public approximate rows are rounded and no hidden public row has coordinates.

## Product Behavior

1. New uploads stay private and location-hidden until publication.
2. Album/share publication defaults to `approximate`.
3. The photo information editor lets the owner select exact, approximate, or hidden location precision.
4. Explore uses only photos whose location precision is exact or approximate.

## Remaining Release Gate

Run three-account Preview QA after the signed-URL Storage build and this location policy build are deployed to `dev`.
