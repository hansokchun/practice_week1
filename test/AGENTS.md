# TEST KNOWLEDGE

## OVERVIEW

Tests use Node's built-in runner and mostly cover pure helpers plus static source contracts for `index.html`, `style.css`, `js/app.js`, and `auth.js`.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Run all tests | `npm test` | Calls `node --test`. |
| Helper behavior | `test/*-*.test.mjs` | Usually imports a matching `js/*.mjs` file. |
| Static DOM/CSS contracts | Tests using `readFileSync(..., 'utf8')` | Class names and markup can be asserted directly. |
| Auth/security flow | `auth-security-flow.test.mjs` | Email verification, Turnstile, upload/publish gates. |
| Persistence errors | `supabase-persistence-errors.test.mjs` | Rollback/error contracts for share and album operations. |
| Encoding guard | `user-facing-copy-encoding.test.mjs` | Avoid accidental mojibake in source copy. |

## CONVENTIONS

- Use `node:test` and `node:assert/strict`.
- Name tests by feature surface, matching the helper or UI contract when possible.
- Add focused tests before changing behavior.
- For PowerShell file searches, prefer `rg "pattern" test -g "*.mjs"` instead of shell-expanded globs.
- Static-contract tests are acceptable here because the app has a large HTML/CSS shell.

## HIGH-RISK FLOWS

- Profile identity: nickname save/read must use `profiles`, with safe fallback labels.
- Sidebar Back: pure helper tests are not enough; verify real authenticated panel flows.
- Explore map: cluster expansion, selected-pin state, stale render tokens, viewport preservation.
- Public routes: owner IDs must survive route changes and profile links.
- Copy-to-map: location copy text must stay plain `lat,lng` with 6 decimal places.

## ANTI-PATTERNS

- Do not delete source-contract assertions just because they are string-based.
- Do not claim navigation fixes complete without browser/manual verification when auth state is involved.
- Do not update expected Korean strings solely from PowerShell mojibake output.
- Do not skip `npm run build` after tests for user-facing JS/CSS/HTML edits.
