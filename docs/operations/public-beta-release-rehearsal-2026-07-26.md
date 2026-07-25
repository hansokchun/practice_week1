# Ikkyee Public Beta Release Rehearsal

**Date:** 2026-07-26  
**Environment:** GitHub `dev` and Cloudflare Pages Preview  
**Preview:** `https://dev.practice-week1-cws.pages.dev`  
**Outcome:** Procedure rehearsed successfully; production remains blocked

## Scope

This rehearsal validates the repeatable release procedure without changing GitHub `main`, Cloudflare Production, Supabase data, Storage visibility, or runtime secrets. No production deployment was performed.

At the start of the rehearsal, `origin/main` was 448 commits behind `origin/dev`. Moving that history to production is a real release and still requires explicit approval after every P0 gate is resolved.

## Rehearsed Procedure

1. Confirm the worktree is clean, the active branch is `dev`, and local `HEAD` exactly matches `origin/dev`.
2. Confirm `origin/main` is an ancestor of `origin/dev`; stop on diverged history.
3. Run `npm test` and `npm run build`.
4. Request the Cloudflare Preview application shell and verify Home, Explore, and login markup.
5. Request every built `/assets/` URL referenced by the shell.
6. Verify `/api/config` returns valid JSON with the browser Google Maps key without printing the value.
7. Verify CSP, permissions, referrer, content-type, frame, and Preview indexing headers.
8. Print the Cloudflare rollback and reversible `git revert` sequence without executing either.

The repeatable command is:

```bash
npm run release:rehearse
```

For the production smoke pass after an explicitly approved release:

```bash
IKKYEE_RELEASE_BASE_URL=https://practice-week1-cws.pages.dev npm run release:rehearse
```

The command intentionally requires `dev` to remain the local verification branch. It does not merge, switch to `main`, push, deploy, modify Supabase, or reveal runtime values.

## Smoke Evidence

| Check | Rehearsal result |
| --- | --- |
| Local test suite | Passing |
| Vite production build | Passing |
| Preview root | HTTP 200 |
| Built JS/CSS assets | HTTP success |
| `/api/config` | HTTP 200, valid JSON, required browser key present |
| Home, Explore, auth shell | Required deployed markup present |
| Security headers | Required baseline headers present |
| Rollback commands | Printed only; no mutation performed |

Authenticated owner and second-account flows are not simulated by this shell check. Their existing QA records remain separate, and the final post-cutover browser regression is still required.

## Rollback Decision

For an application regression, the first operational action is Cloudflare's rollback to the last known-good successful Production deployment. After service recovery and explicit approval, reconcile Git with a normal `git revert`; never use force push or history rewriting.

For a Preview-only regression, revert or fix the change on `dev` and wait for a new Preview. Preview deployments are not Production rollback targets.

Storage privacy is handled separately. Do not make a private bucket public as a routine rollback, delete `storage_path` values, or remove source-location records.

## Remaining Production Blockers

- Complete the encrypted database backup and restore rehearsal against a disposable Supabase project.
- Complete real-device authentication QA for email verification, reset, Google OAuth, Kakao OAuth, and logout.
- Obtain explicit approval for the release and private-bucket cutover.
- After the signed-URL-compatible build reaches `main`, perform the private-bucket cutover and final owner, second-account, and logged-out Storage regression.
- Approve the public support address, retention policy, and final legal copy before opening public traffic.

This rehearsal closes the P1 procedure-design gate. It does not close or waive any P0 blocker.

## Related Files

- `scripts/rehearse-public-beta-release.sh`
- `docs/product/public-beta-launch-checklist-2026-07-22.md`
- `docs/operations/public-beta-operations-runbook-2026-07-22.md`
- `docs/qa/storage-rls-preview-qa-2026-07-24.md`
