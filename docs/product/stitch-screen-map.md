# Stitch Screen Map

Source project: `Personal Travel Map Archive` (`projects/8047004610886948075`)

This file is the implementation bridge between the Stitch prototype and the current codebase. The product plan remains the scope document, but Stitch is the visual and flow reference.

## Phase 1 Target

Phase 1 should make the existing app feel like the Stitch prototype without rebuilding every screen as a separate route. Keep the current data model, Leaflet map, upload handlers, profile handlers, and detail behavior.

## Screen Mapping

| Stitch screen | Current code target | Phase 1 treatment |
| --- | --- | --- |
| Home / Landing: Archival Archive Tool | `#panel-home` in `index.html` | Rebuild copy, stats, CTA flow, and archival surface styling |
| My Photos Dashboard: Optimized Stream Layout | `#panel-explore` with `state.viewMode = "my"` | Restyle header, filters, search, and grid cards as Myphoto archive |
| ?? ???: ?? ?? ? | `#panel-upload` | Implemented as a real upload entry page |
| Photo Upload: Myphoto Workspace | `#panel-upload` + existing upload pipeline | Implemented as a workspace panel; full file review wizard remains future work |
| ?? ???: ??? ?? | `#panel-upload` complete state | Implemented as a result screen with preview grid, counts, and next actions |
| Review Map: Unified Date Divider Style | `#panel-explore` + `renderAll()` grouped grid | Implemented with visible/mapped/public summary, date chips, and date-divider grouped archive cards |
| ?? ???: ?? ?? ?? | `#panel-album-review` + profile album view | Implemented as a review page with summary, map coverage, privacy, and trip preview actions |
| ?? ?? | `#panel-share-settings` | Implemented as a real visibility review page from detail |
| Explore: Updated Detailed Map Background | `#panel-explore` with `state.viewMode = "shared"` plus map | Restyle Explore label, filters, and public map tone |
| Explore: Selected Pin Sidebar View | `#panel-detail` selected pin summary | Implemented as a selected-pin summary inside the detail side panel |
| Photo Detail Modal: Archival Archive View | `#panel-detail` | Phase 1 modal-style surface implemented; deeper parity can iterate |
| Public Profile: Map View Tab | `#panel-user-profile` photo/map mode | Implemented as a map-first public profile surface with Stitch tab language |
| Public Profile: Albums Tab | `#panel-user-profile` album mode | Implemented with archival album cards, create-card state, and public trip preview entry |
| Public Trip: Jeju East Coast Drive | `#panel-public-trip` | Implemented as an album-based public trip preview with route summary and stop timeline |

## Design Tokens

- Deep Teal: `#1A4D4E`
- Warm Ivory: `#F9F7F2`
- Soft Coral: `#F48C71`
- Charcoal Text: `#2D2D2D`
- Muted Slate: `#70787D`
- Private Gold: `#C9A050`

## Near-Term Priority

1. Make the main shell map-first: archival panel on the left, map on the right.
2. Make Home match Stitch's quiet archive landing instead of the temporary feature list.
3. Make Myphoto/Explore use the same dashboard surface and card language as Stitch.
4. Promote upload and public settings from direct buttons into Stitch-style pages.
5. Keep all working behaviors intact.
