# Mobile Performance Budget

**Measured:** 2026-08-30
**Target:** Cloudflare Pages production build, mobile viewport 390 x 844

## Enforced Build Budgets

Run `npm run perf:budget` before a release.

| Asset group | Budget | Current |
| --- | ---: | ---: |
| JavaScript, gzip | 65 KB | 61.28 KB |
| CSS, gzip | 32 KB | 30.93 KB |
| All static images | 2,200 KB | 2,169.90 KB |
| Largest static image | 450 KB | 348.74 KB |

The checker reads the generated `dist/assets` files and exits with a failure when a budget is exceeded.

## Improvement

The four below-the-fold home illustrations now reference their compact JPEG versions directly. This removes unused PNG fallback files from the Vite output:

- Previous generated static-image payload: approximately 9.84 MB
- Current generated static-image payload: 1.84 MB
- Removed from deployment artifacts: approximately 8.00 MB

The images retain explicit dimensions, lazy loading, and asynchronous decoding. Modern browsers already selected the JPEG `<source>` before this change, so the primary user-facing improvement is a smaller, simpler deployment artifact and a guard against PNG fallback downloads.

The landing globe artwork was also converted from a non-transparent 1,133.59 KB PNG to an 82.70 KB JPEG at the same 1536 x 1024 dimensions. The current 65 KB JavaScript ceiling reflects the expanded landing search, tag gallery, Explore clustering, photo-detail, and AI-analysis contracts while preserving less than 4 KB of headroom.

The CSS ceiling increased from 30 KB to 32 KB on 2026-09-01 for the authenticated feedback form and administrator review states. JavaScript and image ceilings remain unchanged.

## Route Rendering

`renderRoute` records its synchronous render duration on `body[data-route-render-ms]`. It does not transmit measurements or include asynchronous map/network loading.

| Scenario | Mobile measurement |
| --- | ---: |
| Initial Home render | 0.40 ms |
| Home to Explore | 0.10 ms |
| Explore to Home | 0.30 ms |

The mobile route-render QA budget is 100 ms. The 390 x 844 check had no horizontal overflow, and the Home and Explore surfaces both became active correctly.

## Release Check

1. Run `npm test`.
2. Run `npm run perf:budget`.
3. Open the production build at 390 x 844.
4. Confirm Home and Explore have no horizontal overflow.
5. Confirm `data-route-render-ms` remains below 100 ms for Home and Explore.

Network-dependent map readiness is tracked separately from synchronous route rendering.
