# Ikkyee Public Beta Release Candidate

**Verified:** 2026-07-27  
**Candidate:** `ed19c3582b05` on GitHub `dev`  
**Production baseline:** `6dbc08e57fb3` on GitHub `main`  
**Preview:** `https://dev.practice-week1-cws.pages.dev`  
**Decision:** Technically rehearsed; not approved for production

## Result

The non-production release rehearsal passed for the exact `origin/dev` candidate. The worktree was clean, local `HEAD` matched `origin/dev`, and `origin/main` was an ancestor of `origin/dev`. The candidate is 457 commits ahead of the current production baseline.

| Check | Result |
| --- | --- |
| Automated tests | 423 passing, 0 failing |
| Vite production build | Passing |
| Preview application shell | Passing |
| Built JS and CSS assets | Passing |
| `/api/config` shape | Passing without printing the key |
| Required security headers | Passing |
| Reversible rollback procedure | Printed and reviewed; not executed |

The repeatable verification command was:

```bash
npm run release:rehearse
```

## Change Boundary

- No `main` push, merge, or production deployment was performed.
- No Supabase data deletion, schema mutation, Storage visibility change, or secret change was performed.
- No current sample photo, album, like, comment, location, or Storage object was preserved or deleted during this check.
- The disposable-sample-data decision remains active for the later private Storage cutover.

## Remaining Gates

4 P0 gates remain:

1. Deploy the signed-URL-compatible candidate to `main` only after explicit approval, then make the shared `photos` bucket private.
2. Verify private-file denial and complete the three-account owner, non-owner, and logged-out browser regression with fresh minimal fixtures.
3. Run real-device authentication QA for email verification/reset, Google, Kakao, logout, and redirects.
4. Keep leaked-password protection deferred while the project remains on Supabase Free; recheck after a paid-plan upgrade.

Before opening public traffic, the support address, retention policy, and legal copy also require final human approval. This candidate record proves the automated and Preview release path only; it does not waive those gates or authorize production.

## Next Approved Sequence

1. Receive an explicit request to deploy `dev` to `main`.
2. Deploy and smoke-test Cloudflare Production.
3. Delete disposable sample content if it slows the cutover.
4. Make the `photos` bucket private.
5. Create minimal fresh QA fixtures and run the final access and lifecycle checks.
6. Remove the fixtures and update the launch checklist.

