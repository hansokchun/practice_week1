# Stitch-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary P0 shell with UI flow and visual language based on the Stitch project `Personal Travel Map Archive`.

**Architecture:** Keep the current vanilla JS/Leaflet app and existing data/rendering behavior, but restyle and restructure the visible shell to match Stitch. Use Stitch as the screen source of truth and the product plan as behavior/source-of-scope guidance.

**Tech Stack:** Vanilla HTML/CSS/JS, Leaflet, existing Supabase auth/data helpers, Stitch MCP reference screens.

---

## File Structure

- Modify `index.html`: rename and reshape shell copy/controls to match Stitch pages.
- Modify `style.css`: replace Instagram-like styling with Archival Horizon tokens and map-first layouts.
- Modify `js/render.js`: update empty states and grid item markup so Myphoto/Explore match archive cards.
- Modify `js/events.js`: keep routing behavior, adjust labels/UX where needed.
- Modify `docs/product/stitch-screen-map.md`: record Stitch screen-to-code mapping for future work.

## Stitch Source Screens

Primary implementation references:
- Home: `Home / Landing: Archival Archive Tool`
- Myphoto: `My Photos Dashboard: Optimized Stream Layout`
- Upload: `사진 올리기: 파일 선택 전`, `Photo Upload: Myphoto Workspace`, `사진 올리기: 업로드 완료`
- Album review: `앨범 만들기: 분석 결과 확인`
- Sharing: `공개 설정`
- Explore: `Explore: Updated Detailed Map Background`, `Explore: Selected Pin Sidebar View`
- Detail: `Photo Detail Modal: Archival Archive View`
- Public profile/trip: `Public Profile: Map View Tab`, `Public Profile: Albums Tab`, `Public Trip: Jeju East Coast Drive`

## Tasks

### Task 1: Save Stitch Mapping

- [x] Create `docs/product/stitch-screen-map.md` with the screen inventory, implementation priority, and code target for each screen.
- [x] Note that current work is Phase 1 visual alignment, not full page-by-page feature parity.

### Task 2: Apply Archival Horizon Tokens

- [x] Update `style.css` root tokens to Deep Teal, Warm Ivory, Soft Coral, Charcoal, Muted Slate, Private Gold.
- [x] Switch typography stack to Be Vietnam Pro/Hanken Grotesk where available, with Pretendard fallback.
- [x] Reduce Instagram-like black/blue styling and replace it with quiet archival surfaces.

### Task 3: Rebuild App Shell Toward Stitch Flow

- [x] Change sidebar position/layout to Stitch-like persistent left archival panel on desktop, map canvas on the right.
- [x] Keep mobile bottom-sheet behavior but restyle grabber, rounded top corners, and spacing.
- [x] Restyle `Home / Myphoto / Explore` as a quiet top product nav, not a temporary tab strip.

### Task 4: Rework Home Panel

- [x] Replace temporary Home copy with Stitch-oriented archive landing content.
- [x] Add visual/stat sections that communicate private archive, map timeline, and controlled sharing.
- [x] Primary CTA opens Myphoto, secondary CTA opens Explore.

### Task 5: Rework Myphoto/Explore Sidebar Surface

- [x] Update header labels, upload CTA, filters, search, and view tools to match Stitch's archival dashboard tone.
- [x] Restyle photo grid cards with image ratio, metadata rail, privacy badges, and quiet empty states.
- [x] Keep existing renderer data logic intact.

### Task 6: Rework Detail/Profile Surfaces Enough For Consistency

- [x] Restyle existing detail panel controls and badges toward Stitch detail modal.
- [x] Keep current behavior intact; deeper modal parity is deferred.

### Task 6.5: Promote Required Stitch Flow Pages

- [x] Add `#panel-upload` so the upload flow starts from a Stitch-style workspace page.
- [x] Add a Stitch-style upload completion state with preview grid, result counts, and review actions.
- [x] Add `#panel-share-settings` so public/private visibility is reviewed on a dedicated page.
- [x] Add `#panel-album-review` so new albums land on a Stitch-style analysis/review page.
- [x] Add album analysis details for map coverage, privacy, and public trip readiness.
- [x] Add `#panel-public-trip` so albums can preview a Stitch-style public trip page.
- [x] Add route summary and stop timeline to `#panel-public-trip`.
- [x] Add selected-pin summary behavior inside `#panel-detail` to match Explore selected-pin flow.
- [x] Refine `#panel-detail` toward the Stitch photo detail modal surface.
- [x] Add `Review Map: Unified Date Divider Style` behavior with date chips, grouped date dividers, and map/grid summary counts.
- [x] Refine `#panel-user-profile` toward Stitch's Public Profile Map View and Albums tabs.
- [x] Keep the existing upload and Supabase sharing behavior wired underneath those pages.

### Task 7: Verification

- [x] Run `npm.cmd test`.
- [x] Run `npm.cmd run build`.
- [x] Run a local HTTP smoke check against Vite.

## Phase Boundary

This pass should make the current app visibly follow Stitch's flow and brand. It should not attempt to implement every Stitch screen as a separate route yet; upload wizard, public trip page, and profile page full parity can follow after the shell/dashboard/detail surfaces match.
