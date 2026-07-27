# Ikkyee Public Beta Production Release

**Released:** 2026-07-27  
**Application release:** `a3030727e97f`  
**Branches:** GitHub `dev` and `main` synchronized  
**Cloudflare deployment:** `https://73a8903c.practice-week1-cws.pages.dev`  
**Production:** `https://practice-week1-cws.pages.dev`  
**Outcome:** Production deployment and smoke verification passed

## Deployment

The approved `dev` history was fast-forwarded to GitHub `main`. Cloudflare Pages created a Production deployment from `main` at `a3030727e97f`. No force push, history rewrite, manual artifact substitution, or unreviewed branch merge was used.

The first Production smoke attempt found that the release script incorrectly required Cloudflare's Preview-only `X-Robots-Tag: noindex` header on Production. The application itself was healthy. Commit `a3030727e97f` corrected the environment-specific assertion, passed on `dev`, and was then fast-forwarded to `main`.

## Verification

| Check | Result |
| --- | --- |
| GitHub `dev` and `main` | Same release commit |
| Candidate distance from production | 0 commits |
| Automated tests | 427 passing, 0 failing |
| Vite production build | Passing |
| Cloudflare Production status | Successful |
| Production application shell | Passing |
| Built JS/CSS/image assets | Passing |
| `/api/config` | Passing without exposing its value |
| CSP, permissions, referrer, content-type, frame headers | Passing |
| Preview indexing protection | `X-Robots-Tag: noindex` still required on Preview |

The final command was:

```bash
IKKYEE_RELEASE_BASE_URL=https://practice-week1-cws.pages.dev npm run release:rehearse
```

## Data And Storage Boundary

- No Supabase data was deleted or modified during this release.
- No Auth account, secret, OAuth setting, environment variable, RLS policy, or Storage object was changed.
- The shared `photos` bucket remains public.
- The production application is now signed-URL compatible, so the separate private-bucket cutover is no longer blocked by an outdated Production build.
- Current sample photos and related records remain disposable under the recorded sample-data reset decision.

## Next Gate

Refresh the live aggregate Supabase preflight, delete disposable sample content only if useful, make the `photos` bucket private, and run the owner, non-owner, and logged-out access regression with fresh minimal fixtures. The private-bucket mutation remains a separate operational step.

