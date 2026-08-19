# Ikkyee Mobile Prototype Design System

## 0. Source And Intent

This scoped system extracts the existing Ikkyee web design language for the standalone mobile prototype. Its concrete visual grounding is the root [`DESIGN.md`](../../DESIGN.md), the protected web shell, and `docs/audits/assets/2026-08-10/05-explore-mobile.png`.

The direction is **quiet editorial cartography**: warm paper-like chrome frames a cool map field; deep green signals intentional action; photographs are evidence from a place rather than decorative tiles. The remembered moment is opening a location marker into a photograph that appears to have been found on the map.

The prototype is a documentation artifact and is intentionally outside Vite and Cloudflare production inputs.

## 1. Tokens

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--paper` | `#f9f7f2` |
| Elevated surface | `--surface` | `#ffffff` |
| Soft surface | `--mist` | `#edf1eb` |
| Ink | `--ink` | `#191c1c` |
| Muted copy | `--muted` | `#687478` |
| Primary | `--pine` | `#1a4d4e` |
| Deep primary | `--pine-deep` | `#003637` |
| Map water | `--water` | `#9ed8e2` |
| Map land | `--land` | `#e1eadb` |
| Warm status accent | `--coral` | `#f48c71` |
| Archive accent | `--gold` | `#c9a050` |
| Divider | `--line` | `rgba(26, 77, 78, 0.16)` |
| Shadow | `--float-shadow` | `0 12px 30px rgba(0, 54, 55, 0.16)` |
| Radius / media | `--radius-media` | `8px` |
| Radius / surface | `--radius-surface` | `12px` |
| Radius / pill | `--radius-pill` | `999px` |
| Space scale | `--space-1` through `--space-6` | `4px, 8px, 12px, 16px, 24px, 32px` |

Typography uses `SUIT Variable`, `SUIT`, `Inter`, and system sans-serif. The Ikkyee wordmark may use Georgia. Mobile sizes are fixed, not viewport-scaled: 28px title, 20px panel title, 16px body, 13px metadata, and 12px navigation label. Letter spacing remains `0`.

## 2. Layout

- The working mobile artboard is 390x844 and must remain usable at 360x800.
- The app owns the viewport with a fixed 72px safe-area-aware bottom navigation and a map or scroll body above it.
- Page gutters are 16px; compact controls use 12px internal spacing.
- The top chrome is 64px plus safe-area inset. The profile thumbnail is 36px.
- The map field is a stable visual region, not a stretchy content card. Floating controls and sheets reserve bottom space above navigation.
- Photo grids use two equal columns with a declared 4:5 media ratio.

## 3. Primitives

| Primitive | Purpose | Required states |
| --- | --- | --- |
| Brand bar | Context, profile entry | guest, signed-in, focus |
| Search field | Place query | resting, active, search result |
| Scope pill | Public photo filter | closed, expanded, selected |
| Map marker | Opens a nearby photo | resting, selected, keyboard focus |
| Bottom sheet | Marker preview and action transition | closed, preview, expanded detail |
| Icon button | Back, close, share, map/list control | resting, pressed, focus, disabled |
| Bottom tab | Primary area navigation | inactive, active, focus |
| Photo tile | Personal and liked photo entry | resting, selected, missing location |
| Confirmation surface | Location and visibility decisions | review, confirmed |
| Status preview | Network/content feedback | loading, empty, error, offline |

Buttons always use native controls, minimum 44x44px hit areas, and visible focus rings. Icons are inline SVG symbols with accessible labels supplied by their owning buttons.

## 4. Surface And Image Treatment

- Paper and white surfaces define product structure; deep-green areas are reserved for active navigation and primary commands.
- The map uses water, land, a faint latitude/longitude grid, labels, and photo markers rather than a generic blue gradient.
- Floating controls and sheets receive the one shared `--float-shadow`; lists and photo tiles do not become floating cards.
- Photos use existing repository assets read-only, with 8px corners and cropped object-position values that keep places legible.
- Borders carry hierarchy before shadows. Large surfaces remain near-square at 12px or below.

## 5. Interaction And Motion

- Standard transitions are 180ms `cubic-bezier(.2,.8,.2,1)` and use only opacity and transform.
- Selecting a marker lifts the corresponding map marker and brings the sheet from below the navigation-safe zone.
- Tab changes reset the scroll region and update the current tab without a page-wide animation.
- A pressed control scales to `0.98`; it never changes layout dimensions.
- Sheets close with Escape and their close buttons return focus to the invoking control.
- `prefers-reduced-motion: reduce` removes transitions and transforms while retaining all state changes.

The interaction pattern is adapted from the repository’s existing map-first Explore convention: layered search, scope selection, selected marker preview, then full photo detail.

## 6. Responsive And Accessibility Rules

- At 360px, gutters tighten to 12px and metadata can wrap; controls never shrink below 44px.
- At 390px and 360px, bottom-sheet actions remain above the 72px navigation plus safe-area inset.
- Long Korean labels wrap rather than clipping. No container relies on negative letter spacing.
- Decorative map details are hidden from assistive technology; interactive markers, photos, and status controls have explicit names.
- Dialog-like sheets use `role="dialog"`, labels, close controls, and keyboard escape support.
- Color is never the only signal: publication uses a text label, missing location has copy, and selected tabs have text and an indicator.
- The focus treatment is a 3px pale-gold outer ring around the control.

## 7. Accepted Debt

- This is a static prototype with local state, not a production auth, map, upload, or social implementation.
- Map geography is illustrative and uses repository assets rather than an interactive map service.
- The prototype uses a small inline SVG symbol sprite rather than importing the production icon family.
- The profile thumbnail uses the existing fallback image; it does not represent a real account avatar.
- Visual approval remains pending; this file is an implementation contract for the prototype, not a substitute for user review.
