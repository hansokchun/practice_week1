# Profile Nickname and Sidebar Back Spec

## Goal

Fix profile nickname updates so they are required, unique, saved reliably, and visible everywhere another user can see profile identity. Also make sidebar Back buttons return to the immediately previous sidebar panel instead of a fixed destination.

## Requirements

- Photo detail must provide a top-action button that copies the photo location.
- Copied location format must be `lat,lng`, such as `37.566535,126.977969`, so it can be pasted directly into Google Maps.
- Copied coordinates must use 6 decimal places for better precision.
- If the photo has no valid location, show `위치정보가 없습니다.`
- On successful copy, show `위치 정보가 복사되었습니다.`
- Nicknames are required. Empty or whitespace-only nicknames must not be saved.
- Nicknames are unique. Duplicate nickname errors from Supabase must show a clear duplicate-name message.
- Profile updates must continue to save age, gender, and avatar metadata when valid.
- Public nickname display must use the `profiles` table wherever possible:
  - photo detail author name
  - comment author name
  - user profile page nickname
- If a nickname lookup fails, the UI must fall back to the current safe label format instead of breaking.
- The profile save failure currently shown as "닉네임 변경 중 오류가 발생했습니다." must expose better diagnostics in the console and a more precise user-facing message.
- Sidebar Back should eventually return to the previous sidebar panel, but the first history-stack implementation was rolled back because it was not fully verified in real authenticated panel flows.
- `package.json` description may be changed to English to avoid terminal encoding confusion.
- Local changes should be committed to `dev` and pushed to `origin/dev` after verification.
- `main` must not be updated unless explicitly requested.

## Approach

Use a small utility layer rather than a large SPA router rewrite.

1. Add a profile directory helper in `auth.js` for reading display profiles from Supabase.
2. Add a focused browser-friendly nickname cache module so UI modules can resolve names consistently.
3. Keep current panel architecture intact: `activatePanel` remains the single DOM switcher.
4. Add Node built-in tests for profile-name helper behavior before implementation.

## Data Flow

Saving a profile:

1. Validate nickname locally.
2. Upsert `{ id, nickname }` into `profiles`.
3. Update Supabase Auth metadata.
4. Update local `state.currentUser.user_metadata`.
5. Refresh visible UI labels and profile cache.

Displaying a public name:

1. Check whether the target user is the current user.
2. Check cached profile display name.
3. Fetch from `profiles` if needed.
4. Fall back to `User abcd` if unavailable.

## Testing

- Unit-test required nickname validation.
- Unit-test profile display fallback and cache behavior.
- Run the Vite build after implementation.

## Security Checklist Scope

The requested `G-Stack: CSO` skill is not available in this Codex session. I will perform a local security checklist instead, focused on:

- no service-role keys or secrets added
- Supabase anon key unchanged
- no unsafe HTML injection from nicknames
- duplicate nickname errors handled without leaking sensitive details
- Back navigation does not expose private photos across users
