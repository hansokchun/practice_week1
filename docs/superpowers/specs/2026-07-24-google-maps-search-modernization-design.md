# Google Maps Search Modernization Design

## Goal

Replace the deprecated Google Maps `SearchBox` autocomplete integration in Explore while preserving the existing form-based place search and map navigation behavior.

## Scope

- Keep the existing Explore search input and submit button.
- Load the Google Maps JavaScript API with the Places library asynchronously.
- Use `google.maps.places.Autocomplete` for selecting a suggested place.
- Keep `PlacesService.findPlaceFromQuery` as the fallback when a user submits free text.
- Leave photo-pin rendering on the current marker implementation; its Advanced Marker migration needs a dedicated visual and accessibility review.

## Data Flow

1. `loadGoogleMapsApi` loads the Maps JavaScript API with `loading=async` and `libraries=places`.
2. `ensureExploreMap` creates the map, attaches one Autocomplete instance to the existing input, and requests only place geometry and name.
3. Selecting a suggestion pans and zooms the map to its geometry.
4. Submitting free text continues to call `findPlaceFromQuery`, so keyboard entry works even when no suggestion is selected.

## Error Handling

- If the Maps key or API is unavailable, the existing map warning remains unchanged.
- A selected suggestion without geometry is ignored safely.
- A free-text query with no result keeps the existing toast feedback.

## Testing

- Source-level regression tests assert async loading, Autocomplete usage, requested fields, and the absence of `SearchBox`.
- The focused test must fail before the production change, then pass after it.
- Run the complete test suite and production build before deployment.
