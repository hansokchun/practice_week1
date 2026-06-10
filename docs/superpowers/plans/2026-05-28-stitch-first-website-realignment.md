# Stitch-First Website Realignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign the Travelgram / Ikkyee website to the Stitch `Personal Travel Map Archive` screens while preserving usable upload, map, photo, profile, and data behavior.

**Architecture:** Keep the current Vite-powered static website and vanilla JavaScript modules. Replace the visible page structure and styling around existing behavior rather than rewriting the upload/map/data core.

**Tech Stack:** Vite, vanilla JavaScript modules, Leaflet, Google Maps Places script, Supabase-style helper API in `auth.js`, Node test runner.

---

## File Structure

- Modify `index.html`: restructure visible sections around Stitch page flow and Korean copy.
- Modify `style.css`: replace current visual system with Archival Horizon tokens and responsive website layouts.
- Modify `js/events.js`: adjust section routing and CTA wiring for landing, Myphoto, upload, visibility, public trip, and profile flows.
- Modify `js/render.js`: tune Myphoto/Explore copy, empty states, map summary, date dividers, and public/private display.
- Modify `js/upload.js`: align upload start/complete copy and counters; preserve processing behavior.
- Modify `js/detail.js`: split private detail and public selected-pin affordances where possible without a rewrite.
- Modify `js/profile.js`: align public profile map/albums tab labels and cards.
- Modify tests in `test/*.test.mjs`: update section/copy assertions and preserve route/state behavior.
- Reference docs: `docs/product/stitch-first-screen-inventory-2026-05-28.md`, `docs/product/Travelgram_Ikkyee_stitch_first_product_plan_2026-05-28.md`.
- Phase 2 admin website files are intentionally not part of Tasks 1-6. Add them only after user-facing Stitch parity is acceptable.

## Tasks

### Task 1: Lock Website Navigation And Section Semantics

**Files:**
- Modify: `index.html`
- Modify: `js/events.js`
- Test: `test/app-sections.test.mjs`
- Test: `test/page-state.test.mjs`

- [ ] **Step 1: Update tests for Stitch-first section semantics**

Run: `npm test`

Expected before edit: current tests pass or reveal old route labels. Capture failures before changing code.

- [ ] **Step 2: Rename visible navigation copy**

Use these visible labels in `index.html`: `Home`, `Myphoto`, `Explore`, `새 여행 만들기`. Keep existing element IDs so current JavaScript keeps working.

- [ ] **Step 3: Ensure CTA routing matches Stitch**

In `js/events.js`, keep `btnHomeStart` routed to Myphoto and `btnHomeExplore` routed to Explore. Confirm upload buttons still activate `panel-upload`.

- [ ] **Step 4: Run route tests**

Run: `npm test -- test/app-sections.test.mjs test/page-state.test.mjs`

Expected: PASS.

### Task 2: Apply Archival Horizon Design Tokens

**Files:**
- Modify: `style.css`
- Modify: `index.html`

- [ ] **Step 1: Replace token variables**

Set the main CSS variables to the Stitch palette: Deep Teal `#1A4D4E`, Soft Coral `#F48C71`, Warm Ivory `#F9F7F2`, Charcoal `#2D2D2D`, Muted Slate `#70787D`, Private Gold `#C9A050`.

- [ ] **Step 2: Update typography**

Load or preserve `Be Vietnam Pro` and `Hanken Grotesk`. Use heading/body token classes or CSS variables consistently.

- [ ] **Step 3: Remove visual direction conflicts**

Revise any high-energy, dark, or generic social-feed styling that conflicts with the quiet archive tone.

- [ ] **Step 4: Build and inspect CSS**

Run: `npm run build`

Expected: Vite build succeeds.

### Task 3: Rebuild Landing As Website Home

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: Replace home panel content**

Use Stitch sections: hero, how it works, recent albums, public examples, public photo preview, footer. Keep copy Korean-first where Stitch uses Korean.

- [ ] **Step 2: Preserve CTA IDs**

Keep `btn-home-start` and `btn-home-explore` in the new markup.

- [ ] **Step 3: Add responsive web layout**

Desktop should read like a website page, while mobile stacks sections without relying on an app-like sidebar as the first impression.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

### Task 4: Rework Myphoto And Upload Spine

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `js/upload.js`
- Test: existing upload behavior manually after build

- [ ] **Step 1: Change Myphoto panel identity**

Make `#panel-explore` render as Myphoto when `state.viewMode === "my"`: upload/create album actions, missing-location task, recent photos, albums.

- [ ] **Step 2: Align upload start state**

Update `#upload-start-state` to match Stitch upload entry/workspace copy and privacy notice.

- [ ] **Step 3: Align upload complete state**

Update `showUploadComplete()` text and counters to Stitch Korean result language while keeping existing result object behavior.

- [ ] **Step 4: Run tests and build**

Run: `npm test`

Run: `npm run build`

Expected: PASS.

### Task 5: Rework Review Map, Detail, And Visibility

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `js/render.js`
- Modify: `js/detail.js`
- Modify: `js/events.js`

- [ ] **Step 1: Review map surface**

Update the map review header/actions to Stitch: share, public settings, edit, add photo, day dividers.

- [ ] **Step 2: Detail surface**

Make `#panel-detail` visually closer to Stitch detail modal while preserving edit location, delete, copy, like, and comment controls.

- [ ] **Step 3: Visibility surface**

Expand `#panel-share-settings` copy and controls toward album visibility, link sharing, public, location exposure, and time exposure. Persist only the currently supported `shared` boolean unless data migration is approved later.

- [ ] **Step 4: Verify detail route**

Run: `npm test`

Expected: PASS.

### Task 6: Rework Public Explore, Public Trip, And Profile

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `js/render.js`
- Modify: `js/profile.js`

- [ ] **Step 1: Explore empty and selected states**

Update Explore empty-region messaging and selected-pin actions to match Stitch language.

- [ ] **Step 2: Public trip page**

Update `#panel-public-trip` with public hero, route, day timeline, author block, and related albums.

- [ ] **Step 3: Public profile pages**

Update profile map/albums tabs, card design, and labels to match Stitch public profile screens.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Run: `npm run build`

Expected: PASS.

### Task 7: Phase 2 Minimal Admin Website

**Files:**
- Create or modify: `index.html` or a future `admin.html`
- Create or modify: `js/admin.js`
- Create or modify: `style.css` or future `admin.css`
- Modify: data helpers only after the real backend source is confirmed
- Test: admin route/access tests when authentication roles are available

- [ ] **Step 1: Keep admin outside public navigation**

Do not add Admin to the normal `Home / Myphoto / Explore` navigation. Use `/admin`, `#admin`, or a separate `admin.html` entry only after admin access rules are decided.

- [ ] **Step 2: Define admin access**

Confirm which backend is authoritative for users and roles. Use admin-only access before showing user, photo, album, or report data. If roles are not ready, build the screen as a local protected placeholder and do not connect destructive actions.

- [ ] **Step 3: Add minimal admin dashboard**

Show operational counts: users, photos, albums, public albums, private albums, missing-location photos, recent uploads, and reported items.

- [ ] **Step 4: Add content review lists**

Provide tables for users, photos, albums, and public profiles. Include read-only detail first, then add hide/unpublish actions after moderation persistence exists.

- [ ] **Step 5: Add moderation queue**

Support reported public photos/albums with statuses: `open`, `hidden`, `dismissed`. Every admin action must write an audit log before it affects public content.

- [ ] **Step 6: Verify admin separation**

Run: `npm test`

Run: `npm run build`

Expected: public website routes still pass, and Admin is not visible from normal navigation.

## Approval Boundary

Implementation should not begin until the user approves this Stitch-first plan. The current `dev` branch remains a checkpoint; future work should treat Stitch as the canonical product direction.
