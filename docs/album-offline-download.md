# Offline Album Download

## Web Workflow

- Individual photos already support detail menu > Download. Stored valid GPS
  coordinates are embedded in JPEG EXIF; locationless images get no fabricated GPS.
- Web album detail now has a Download icon next to Share. Once ready, use
  **파일 저장** to start a user-initiated download (including mobile browsers).
  It prepares one
  self-contained HTML document containing every currently accessible album member,
  album note, photo stories, dates, coordinates/precision and a large location map.
- Open the downloaded HTML in a browser without Internet. Photos are embedded
  JPEGs with a maximum 1,600px long edge, not backups of original files.
  Browser printing can save the document as PDF; the large map has its own page.
- No external scripts, fonts, photo signing URLs, cookies, tokens or analytics
  are retained in the offline document. Its CSP disallows scripts and network loads.
- Google tiles, Street View and Places content are not exported. The map uses
  Natural Earth 50m country boundaries (public domain), D3 projection and stored
  photo coordinates. It is a regional location overview, not a street/navigation map.
- Missing coordinates stay missing. Co-located pins show a count without moving
  the actual geographic point. Dateline-crossing albums are centered correctly.

## Access And Resource Boundaries

- Re-read albums and photo metadata through existing RLS wrappers before export.
  Album ownership, membership and current photo visibility are checked again;
  signing happens only for selected accessible photos.
- Other viewers receive only public/link photos belonging to that album owner.
  Owners can export their private album members. Sharing a resulting file also
  shares those private photos and stored locations; the dialog warns about this.
- Failed images abort the entire export; do not silently create a partial album.
  Account changes, route changes and cancellation prevent saving stale work.
- Images are fetched sequentially, converted locally, and progress is shown.
  A 32MiB output cap protects mobile memory; larger albums must be split.
- No DB schema/policy change, new server export job or paid map API is required.
  Downloading photo bytes still consumes ordinary Storage transfer allowance.
- The new HTML album export is web-only. Native apps retain their existing
  individual-photo save/share bridge; they do not expose an unsupported HTML save.
  Native album-file saving can be implemented separately with OS file export.

## Verification

Run `npm test`, `npm run build` and `npm run app:build`.
Test an actual public album and photo download, then open the generated HTML:
verify embedded photos, big map, date/precision, pin/photo anchor navigation,
mobile fit, absence of remote media and script dependencies, and cancellation.
Do not mutate live user photos or privacy settings during QA.

### Recorded QA (2026-10-15)

- An anonymous viewer exported a real public album: 13 accessible JPEG photos,
  5 grouped map markers, 5,319,934-byte HTML file. Every photo was embedded.
- Static file inspection found no scripts, remote media, signing grants, account
  identifiers or storage paths. All marker coordinates were inside the map frame.
- Cancelling preparation closed the dialog and re-enabled the download action.
- The browser automation security policy prevented opening the saved local HTML;
  file structure was inspected instead. Offline rendering/printing and physical
  iOS/Android file-opening behavior remain manual device checks.

## Sources

- [Google Maps restrictions](https://cloud.google.com/maps-platform/terms)
- [Natural Earth public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)
- [World Atlas data](https://github.com/topojson/world-atlas)
- [D3 geographic projections](https://d3js.org/d3-geo/projection)
