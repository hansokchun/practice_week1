# Google Maps Search Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deprecated Explore `SearchBox` integration with Places Autocomplete while preserving free-text map search.

**Architecture:** The existing map loader continues to load the Places library, now explicitly using asynchronous loading. `ensureExploreMap` attaches `Autocomplete` to the existing search input; form submission remains a separate `PlacesService.findPlaceFromQuery` fallback. Marker rendering is intentionally out of scope.

**Tech Stack:** Vite, vanilla JavaScript, Google Maps JavaScript API Places library, Node.js built-in test runner.

---

### Task 1: Capture the replacement contract

**Files:**
- Modify: `test/explore-map-search-modernization.test.mjs`
- Test: `test/explore-map-search-modernization.test.mjs`

- [x] **Step 1: Write the failing test**

```js
test('Explore uses asynchronous Places Autocomplete instead of deprecated SearchBox', () => {
    assert.match(source, /loading=async/);
    assert.match(source, /new maps\.places\.Autocomplete\(input, \{ fields: \['geometry', 'name'\] \}\)/);
    assert.match(source, /state\.exploreSearchBox\.addListener\('place_changed'/);
    assert.doesNotMatch(source, /SearchBox/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test test/explore-map-search-modernization.test.mjs`

Expected: FAIL because `app.js` still loads without `loading=async` and creates `SearchBox`.

- [x] **Step 3: Write minimal implementation**

```js
script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${callbackName}`;

state.exploreAutocomplete = new maps.places.Autocomplete(input, { fields: ['geometry', 'name'] });
state.exploreAutocomplete.addListener('place_changed', () => {
    const place = state.exploreAutocomplete.getPlace();
    if (!place?.geometry?.location) return;
    state.exploreMap.panTo(place.geometry.location);
    state.exploreMap.setZoom(13);
});
```

- [x] **Step 4: Run focused test to verify it passes**

Run: `node --test test/explore-map-search-modernization.test.mjs`

Expected: PASS with one passing subtest.

### Task 2: Verify the application

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-google-maps-search-modernization.md`

- [x] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: exit code 0 with no failing tests.

- [x] **Step 2: Build the production bundle**

Run: `npm run build`

Expected: Vite completes successfully and writes `dist/`.

- [x] **Step 3: Mark verified plan steps complete**

Replace every completed `- [ ]` item above with `- [x]` after its corresponding command succeeds.

### Task 3: Deploy the verified change

**Files:**
- Modify: `js/app.js`
- Modify: `test/explore-map-search-modernization.test.mjs`
- Add: `docs/superpowers/specs/2026-07-24-google-maps-search-modernization-design.md`
- Add: `docs/superpowers/plans/2026-07-24-google-maps-search-modernization.md`

- [ ] **Step 1: Review the final diff**

Run: `git diff --check && git diff -- js/app.js test/explore-map-search-modernization.test.mjs`

Expected: no whitespace errors; only the documented loader and autocomplete changes.

- [ ] **Step 2: Commit the verified change**

Run: `git add js/app.js test/explore-map-search-modernization.test.mjs docs/superpowers/specs/2026-07-24-google-maps-search-modernization-design.md docs/superpowers/plans/2026-07-24-google-maps-search-modernization.md && git commit -m "fix: modernize Explore map search"`

Expected: a new commit on `dev`.

- [ ] **Step 3: Push the `dev` branch**

Run: `git push origin dev`

Expected: the remote `dev` branch updates and Cloudflare Pages starts its Preview deployment.
