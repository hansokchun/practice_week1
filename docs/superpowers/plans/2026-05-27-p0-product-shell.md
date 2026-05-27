# P0 Product Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the current working Travelgram prototype around the v2.1 `Home / Myphoto / Explore` product shell while preserving upload, map, Supabase, and photo-detail behavior.

**Architecture:** Add a small pure routing/state layer that maps top-level sections to the current rendering modes, then update the HTML/CSS/event wiring to expose Home, Myphoto, and Explore as the primary navigation. Keep the existing vanilla ES module architecture and avoid database changes in P0.

**Tech Stack:** Vanilla JavaScript ES modules, Node `node:test`, Vite, existing Supabase browser client, Leaflet.

---

## Scope

This plan implements P0 only. It does not implement the future album/trip schema, public precision policy, or full Stitch visual migration. It prepares the app so later Myphoto, Explore, and privacy work has the correct product shape.

Primary references:

- Product plan: `docs/product/Travelgram_Ikkyee_product_plan_v2.1.md`
- Scope decision: `docs/product/v2.1-current-scope-decision.md`
- Stitch project: `Personal Travel Map Archive` (`8047004610886948075`)

## File Structure

- Create `js/app-sections.mjs`
  - Pure helper functions for section names, route hashes, and compatibility with current `viewMode`.
- Create `test/app-sections.test.mjs`
  - Unit tests for section normalization and hash parsing.
- Modify `js/state.js`
  - Add `appSection` state and persist it in `sessionStorage`.
  - Cache new navigation DOM nodes.
- Modify `index.html`
  - Add primary navigation for `Home`, `Myphoto`, `Explore`.
  - Add a small Home panel that explains the product promise and routes into Myphoto/Explore.
  - Rename existing feed controls to align with Myphoto/Explore language.
- Modify `style.css`
  - Style the top-level navigation and Home panel using the calmer archival direction from Stitch.
  - Keep current layout stable.
- Modify `js/events.js`
  - Wire primary navigation and Home CTAs.
  - Map `Myphoto` to current private view and `Explore` to current shared view.
- Modify `js/render.js`
  - Respect `state.appSection`.
  - Prevent Home from rendering grid/sidebar content as an active feed.
  - Use Explore language instead of Community language.
- Modify `js/app.js`
  - Restore `appSection` from saved state or URL hash.
  - Initialize the correct product section after `syncData()`.
- Run `npm test` and `npm run build`.

## Task 1: Add Pure Section Helpers

**Files:**

- Create: `js/app-sections.mjs`
- Create: `test/app-sections.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/app-sections.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    APP_SECTIONS,
    getSectionForViewMode,
    getViewModeForSection,
    normalizeAppSection,
    parseSectionHash,
    sectionToHash
} from '../js/app-sections.mjs';

test('normalizeAppSection accepts only top-level product sections', () => {
    assert.equal(normalizeAppSection('home'), APP_SECTIONS.HOME);
    assert.equal(normalizeAppSection('myphoto'), APP_SECTIONS.MYPHOTO);
    assert.equal(normalizeAppSection('explore'), APP_SECTIONS.EXPLORE);
    assert.equal(normalizeAppSection('unknown'), APP_SECTIONS.HOME);
    assert.equal(normalizeAppSection(null), APP_SECTIONS.HOME);
});

test('sectionToHash creates route-like hash values', () => {
    assert.equal(sectionToHash(APP_SECTIONS.HOME), '#/');
    assert.equal(sectionToHash(APP_SECTIONS.MYPHOTO), '#/myphoto');
    assert.equal(sectionToHash(APP_SECTIONS.EXPLORE), '#/explore');
});

test('parseSectionHash handles route-like hashes and legacy photo hashes', () => {
    assert.equal(parseSectionHash('#/'), APP_SECTIONS.HOME);
    assert.equal(parseSectionHash('#/myphoto'), APP_SECTIONS.MYPHOTO);
    assert.equal(parseSectionHash('#/explore?photoId=123'), APP_SECTIONS.EXPLORE);
    assert.equal(parseSectionHash('#1234567890'), null);
    assert.equal(parseSectionHash(''), null);
});

test('viewMode compatibility maps current renderer modes to product sections', () => {
    assert.equal(getSectionForViewMode('my'), APP_SECTIONS.MYPHOTO);
    assert.equal(getSectionForViewMode('shared'), APP_SECTIONS.EXPLORE);
    assert.equal(getViewModeForSection(APP_SECTIONS.MYPHOTO), 'my');
    assert.equal(getViewModeForSection(APP_SECTIONS.EXPLORE), 'shared');
    assert.equal(getViewModeForSection(APP_SECTIONS.HOME), 'my');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL with an import error because `js/app-sections.mjs` does not exist.

- [ ] **Step 3: Add the pure helper module**

Create `js/app-sections.mjs`:

```js
export const APP_SECTIONS = Object.freeze({
    HOME: 'home',
    MYPHOTO: 'myphoto',
    EXPLORE: 'explore'
});

const SECTION_SET = new Set(Object.values(APP_SECTIONS));

export function normalizeAppSection(value) {
    return SECTION_SET.has(value) ? value : APP_SECTIONS.HOME;
}

export function sectionToHash(section) {
    const normalized = normalizeAppSection(section);
    if (normalized === APP_SECTIONS.HOME) return '#/';
    return `#/${normalized}`;
}

export function parseSectionHash(hash) {
    if (!hash || typeof hash !== 'string') return null;
    if (!hash.startsWith('#/')) return null;

    const path = hash.slice(2).split('?')[0].replace(/^\/+|\/+$/g, '');
    if (path === '') return APP_SECTIONS.HOME;
    return SECTION_SET.has(path) ? path : null;
}

export function getSectionForViewMode(viewMode) {
    return viewMode === 'shared' ? APP_SECTIONS.EXPLORE : APP_SECTIONS.MYPHOTO;
}

export function getViewModeForSection(section) {
    return normalizeAppSection(section) === APP_SECTIONS.EXPLORE ? 'shared' : 'my';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test
```

Expected: PASS for `app-sections`, `location-copy`, and `profile-names`.

- [ ] **Step 5: Commit**

```bash
git add js/app-sections.mjs test/app-sections.test.mjs
git commit -m "test: add product section helpers"
```

## Task 2: Persist The Product Section In State

**Files:**

- Modify: `js/state.js`
- Create: `test/page-state.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/page-state.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPageStateSnapshot,
    normalizeSavedPageState
} from '../js/state.js';

test('createPageStateSnapshot persists product section and legacy view state', () => {
    const snapshot = createPageStateSnapshot({
        appSection: 'explore',
        viewMode: 'shared',
        targetUserId: 'user-1',
        profileViewMode: 'albums',
        activeAlbum: 'Jeju',
        currentPhoto: { id: 'photo-1' },
        _targetNickname: 'Mina'
    });

    assert.deepEqual(snapshot, {
        appSection: 'explore',
        viewMode: 'shared',
        targetUserId: 'user-1',
        profileViewMode: 'albums',
        activeAlbum: 'Jeju',
        currentPhotoId: 'photo-1',
        targetNickname: 'Mina'
    });
});

test('normalizeSavedPageState upgrades older saved state without appSection', () => {
    assert.deepEqual(normalizeSavedPageState({ viewMode: 'shared' }), {
        appSection: 'explore',
        viewMode: 'shared'
    });

    assert.deepEqual(normalizeSavedPageState({ viewMode: 'my' }), {
        appSection: 'myphoto',
        viewMode: 'my'
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `createPageStateSnapshot` and `normalizeSavedPageState` are not exported.

- [ ] **Step 3: Update `js/state.js` imports and state**

At the top of `js/state.js`, add:

```js
import { APP_SECTIONS, getSectionForViewMode, normalizeAppSection } from './app-sections.mjs';
```

Inside `createState`, add `appSection` before `viewMode`:

```js
        appSection: APP_SECTIONS.HOME,
        viewMode: 'my',
```

- [ ] **Step 4: Add DOM refs for product shell**

Inside `createUI()`, add these fields near the existing sidebar refs:

```js
        appShell: document.getElementById('app-shell'),
        appNav: document.getElementById('app-nav'),
        navHome: document.getElementById('nav-home'),
        navMyphoto: document.getElementById('nav-myphoto'),
        navExplore: document.getElementById('nav-explore'),
        panelHome: document.getElementById('panel-home'),
        btnHomeStart: document.getElementById('btn-home-start'),
        btnHomeExplore: document.getElementById('btn-home-explore'),
```

- [ ] **Step 5: Add pure snapshot helpers**

Replace the body of `savePageState` with helper usage, and add the two helper exports before it:

```js
export function createPageStateSnapshot(state) {
    return {
        appSection: normalizeAppSection(state.appSection),
        viewMode: state.viewMode,
        targetUserId: state.targetUserId,
        profileViewMode: state.profileViewMode,
        activeAlbum: state.activeAlbum,
        currentPhotoId: state.currentPhoto?.id || null,
        targetNickname: state._targetNickname || null
    };
}

export function normalizeSavedPageState(saved) {
    if (!saved || typeof saved !== 'object') return null;
    return {
        ...saved,
        appSection: saved.appSection
            ? normalizeAppSection(saved.appSection)
            : getSectionForViewMode(saved.viewMode)
    };
}

export function savePageState(state) {
    const snapshot = createPageStateSnapshot(state);
    try {
        sessionStorage.setItem(PAGE_STATE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        // Ignore unavailable sessionStorage, such as private browsing modes.
    }
}
```

Update `loadPageState()` to normalize the parsed value:

```js
export function loadPageState() {
    try {
        const raw = sessionStorage.getItem(PAGE_STATE_KEY);
        return raw ? normalizeSavedPageState(JSON.parse(raw)) : null;
    } catch (e) {
        return null;
    }
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/state.js test/page-state.test.mjs
git commit -m "feat: persist product section state"
```

## Task 3: Add Home / Myphoto / Explore Markup

**Files:**

- Modify: `index.html`

- [ ] **Step 1: Add the top-level nav**

Inside `<div id="sidebar">`, before the existing sidebar header content, add:

```html
<nav id="app-nav" class="app-nav" aria-label="Primary">
    <button id="nav-home" class="app-nav-item active" type="button" data-section="home">Home</button>
    <button id="nav-myphoto" class="app-nav-item" type="button" data-section="myphoto">Myphoto</button>
    <button id="nav-explore" class="app-nav-item" type="button" data-section="explore">Explore</button>
</nav>
```

- [ ] **Step 2: Add the Home panel**

Inside the same sidebar panel container that contains `panel-explore`, add this panel before `panel-explore`:

```html
<section id="panel-home" class="panel active">
    <div class="home-panel">
        <p class="home-kicker">Travelgram / Ikkyee</p>
        <h1>Choose photos, and a travel map is created.</h1>
        <p class="home-copy">
            Archive your personal travel photos on a map first, then share only the moments and locations you choose.
        </p>
        <div class="home-actions">
            <button id="btn-home-start" class="btn-primary" type="button">Open Myphoto</button>
            <button id="btn-home-explore" class="btn-secondary" type="button">Explore public maps</button>
        </div>
        <div class="home-feature-list" aria-label="Product highlights">
            <div>
                <strong>EXIF-aware upload</strong>
                <span>GPS and capture time become the starting point of your archive.</span>
            </div>
            <div>
                <strong>Map-first albums</strong>
                <span>Photos stay connected to place, date, and route.</span>
            </div>
            <div>
                <strong>Controlled sharing</strong>
                <span>Public views are opt-in and should be reviewed before publishing.</span>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 3: Update existing feed labels**

Change the current private feed button label to:

```html
Myphoto
```

Change the current community/shared feed button label to:

```html
Explore
```

Change `Post a Story` to:

```html
Upload Photos
```

- [ ] **Step 4: Run a build check**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add product shell markup"
```

## Task 4: Style The Product Shell

**Files:**

- Modify: `style.css`

- [ ] **Step 1: Add product shell styles**

Add this block near the existing sidebar/header styles:

```css
.app-nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 12px;
    background: var(--bg-panel, #ffffff);
    border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.app-nav-item {
    min-height: 40px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #64748b);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
}

.app-nav-item.active {
    background: var(--primary-color, #1a4d4e);
    color: #ffffff;
}

.home-panel {
    display: flex;
    min-height: calc(100vh - 72px);
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    padding: 32px 28px;
    background: #f9f7f2;
}

.home-kicker {
    margin: 0;
    color: var(--primary-color, #1a4d4e);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.home-panel h1 {
    margin: 0;
    color: var(--text-main, #1f2937);
    font-family: var(--font-heading, inherit);
    font-size: 34px;
    line-height: 1.12;
}

.home-copy {
    margin: 0;
    color: var(--text-muted, #64748b);
    font-size: 16px;
    line-height: 1.6;
}

.home-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.btn-primary,
.btn-secondary {
    min-height: 44px;
    border-radius: 8px;
    padding: 0 16px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
}

.btn-primary {
    border: 1px solid var(--primary-color, #1a4d4e);
    background: var(--primary-color, #1a4d4e);
    color: #ffffff;
}

.btn-secondary {
    border: 1px solid rgba(26, 77, 78, 0.24);
    background: #ffffff;
    color: var(--primary-color, #1a4d4e);
}

.home-feature-list {
    display: grid;
    gap: 12px;
}

.home-feature-list div {
    display: grid;
    gap: 4px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    padding: 14px;
}

.home-feature-list strong {
    color: var(--text-main, #1f2937);
}

.home-feature-list span {
    color: var(--text-muted, #64748b);
    font-size: 13px;
    line-height: 1.45;
}
```

- [ ] **Step 2: Add mobile nav handling**

Inside the current mobile media query, add:

```css
.app-nav {
    position: sticky;
    top: 0;
    z-index: 5;
}

.home-panel {
    min-height: 70vh;
    padding: 28px 20px 40px;
}

.home-panel h1 {
    font-size: 28px;
}
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "style: add product shell styling"
```

## Task 5: Wire Section Navigation

**Files:**

- Modify: `js/events.js`
- Modify: `js/state.js`

- [ ] **Step 1: Update panel activation to include Home**

In `deactivateAllPanels(ui)`, add:

```js
    if (ui.panelHome) ui.panelHome.classList.remove('active');
```

Update the JSDoc type above `activatePanel` to:

```js
 * @param {'home' | 'explore' | 'detail' | 'profile'} panelName
```

Add this switch case:

```js
        case 'home': if (ui.panelHome) ui.panelHome.classList.add('active'); break;
```

- [ ] **Step 2: Import section helpers in `events.js`**

At the top of `js/events.js`, add:

```js
import { APP_SECTIONS, getViewModeForSection, normalizeAppSection, sectionToHash } from './app-sections.mjs';
```

- [ ] **Step 3: Add section switching inside `initEvents`**

Near the top of `initEvents`, after `restoreSidebar`, add:

```js
    function setActiveNav(section) {
        const normalized = normalizeAppSection(section);
        if (ui.navHome) ui.navHome.classList.toggle('active', normalized === APP_SECTIONS.HOME);
        if (ui.navMyphoto) ui.navMyphoto.classList.toggle('active', normalized === APP_SECTIONS.MYPHOTO);
        if (ui.navExplore) ui.navExplore.classList.toggle('active', normalized === APP_SECTIONS.EXPLORE);
    }

    function openSection(section, options = {}) {
        const normalized = normalizeAppSection(section);
        state.appSection = normalized;
        state.showOnlyLiked = false;

        if (normalized === APP_SECTIONS.HOME) {
            activatePanel(ui, 'home');
            setActiveNav(normalized);
            if (!options.skipHash) window.location.hash = sectionToHash(normalized);
            savePageState(state);
            return;
        }

        state.viewMode = getViewModeForSection(normalized);
        activatePanel(ui, 'explore');
        setActiveNav(normalized);
        renderAll();
        if (!options.skipHash) window.location.hash = sectionToHash(normalized);
        savePageState(state);
    }

    state.openSection = openSection;
```

- [ ] **Step 4: Wire nav buttons and Home CTAs**

Add after `state.openSection = openSection;`:

```js
    if (ui.navHome) ui.navHome.onclick = () => openSection(APP_SECTIONS.HOME);
    if (ui.navMyphoto) ui.navMyphoto.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.navExplore) ui.navExplore.onclick = () => openSection(APP_SECTIONS.EXPLORE);
    if (ui.btnHomeStart) ui.btnHomeStart.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.btnHomeExplore) ui.btnHomeExplore.onclick = () => openSection(APP_SECTIONS.EXPLORE);
```

- [ ] **Step 5: Replace old feed toggle handlers**

Replace:

```js
    ui.btnMyFeed.onclick = () => { state.viewMode = 'my'; state.showOnlyLiked = false; renderAll(); savePageState(state); };
    ui.btnSharedFeed.onclick = () => { state.viewMode = 'shared'; state.showOnlyLiked = false; renderAll(); savePageState(state); };
```

With:

```js
    ui.btnMyFeed.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    ui.btnSharedFeed.onclick = () => openSection(APP_SECTIONS.EXPLORE);
```

- [ ] **Step 6: Export `activatePanel` import if missing**

If `events.js` only imports `savePageState`, change the import from `state.js` to:

```js
import { activatePanel, savePageState } from './state.js';
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add js/events.js js/state.js
git commit -m "feat: wire product section navigation"
```

## Task 6: Make Rendering Section-Aware

**Files:**

- Modify: `js/render.js`
- Modify: `index.html`

- [ ] **Step 1: Import section constants**

At the top of `js/render.js`, add:

```js
import { APP_SECTIONS } from './app-sections.mjs';
```

- [ ] **Step 2: Guard Home rendering**

At the beginning of `renderAll(filterDate = 'all')`, after `state.activeDate` is set, add:

```js
        if (state.appSection === APP_SECTIONS.HOME) {
            if (ui.grid) ui.grid.innerHTML = '';
            if (ui.dateChips) ui.dateChips.innerHTML = '';
            if (clusterGroup) clusterGroup.clearLayers();
            if (ui.btnMyFeed) ui.btnMyFeed.classList.remove('active');
            if (ui.btnSharedFeed) ui.btnSharedFeed.classList.remove('active');
            return;
        }
```

- [ ] **Step 3: Ensure Explore wording in markup**

In `index.html`, change any visible `Community` label in primary feed controls to:

```html
Explore
```

Leave database field names and `shared` code unchanged in P0.

- [ ] **Step 4: Hide comments from MVP UI**

In `index.html`, add the `mvp-deferred` class to the comments section:

```html
<div class="comments-section mvp-deferred">
```

In `style.css`, add:

```css
.mvp-deferred {
    display: none !important;
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add js/render.js index.html style.css
git commit -m "feat: align renderer with product sections"
```

## Task 7: Restore Section From Hash Or Session

**Files:**

- Modify: `js/app.js`

- [ ] **Step 1: Import section helpers**

At the top of `js/app.js`, add:

```js
import { APP_SECTIONS, parseSectionHash } from './app-sections.mjs';
```

- [ ] **Step 2: Initialize section after events are wired**

After `initEvents(ctx, { ... })`, add:

```js
    const routeSection = parseSectionHash(window.location.hash);
    if (routeSection) {
        state.appSection = routeSection;
    }
```

- [ ] **Step 3: Update restore logic after `syncData()`**

Before the current `const saved = loadPageState();`, add:

```js
    const routeSectionAfterLoad = parseSectionHash(window.location.hash);
```

Then update the start of restore behavior to:

```js
    const saved = loadPageState();
    const restoredSection = routeSectionAfterLoad || saved?.appSection || APP_SECTIONS.HOME;
    if (state.openSection) {
        state.openSection(restoredSection, { skipHash: !!routeSectionAfterLoad });
    }
```

Keep the existing legacy photo hash deep-link fallback, but only run it when `parseSectionHash(window.location.hash)` returns `null`.

- [ ] **Step 4: Preserve legacy photo hashes**

Change the final `else` block condition from:

```js
    } else {
```

To:

```js
    } else if (!parseSectionHash(window.location.hash)) {
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: restore product section routes"
```

## Task 8: Manual Browser Verification

**Files:**

- No source edits unless verification finds a bug.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 2: Verify Home**

Open the local URL in the Codex Browser.

Expected:

- Home nav item is active.
- Home panel shows the product promise.
- Map does not visually fight the Home content.
- `Open Myphoto` button moves to Myphoto.
- URL hash becomes `#/myphoto`.

- [ ] **Step 3: Verify Myphoto**

Click `Myphoto`.

Expected:

- Existing private photo grid still renders for the logged-in user.
- Upload button remains usable.
- Existing map markers still render for private photos.
- No console error appears.

- [ ] **Step 4: Verify Explore**

Click `Explore`.

Expected:

- Existing shared/public photo view renders.
- Public markers render on the map.
- Pin click still opens the existing detail view.
- Comments are hidden in the detail UI for MVP.

- [ ] **Step 5: Verify mobile layout**

Use a mobile viewport around `390 x 844`.

Expected:

- Primary nav remains reachable.
- Home text does not overflow.
- Myphoto and Explore still work with the bottom-sheet/sidebar behavior.

- [ ] **Step 6: Stop dev server and commit verification fixes**

If no source fixes were needed:

```bash
git status --short
```

Expected: clean except for intentional documentation or plan files.

If fixes were needed:

```bash
git add <fixed-files>
git commit -m "fix: polish product shell behavior"
```

## Self-Review

Spec coverage:

- Home / Myphoto / Explore top-level IA: covered by Tasks 3, 5, 7.
- Preserve current upload/map/data behavior: covered by Tasks 5, 6, 8.
- Hide comments from MVP: covered by Task 6.
- Stitch visual direction, without full redesign: covered by Task 4.
- Public precision and album schema: intentionally deferred to later P1/P2 plans.

Placeholder scan:

- This plan avoids open-ended implementation placeholders. Each code-bearing step includes exact code to add or replace.

Type consistency:

- Product section values are centralized in `APP_SECTIONS`.
- Current renderer compatibility remains through `viewMode` values `my` and `shared`.
