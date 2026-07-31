# Ikkyee Authentication Preview QA

**Date:** 2026-07-26  
**Environment:** `https://dev.practice-week1-cws.pages.dev`  
**Status:** Partial pass; real-device launch gate remains open

## Scope And Boundary

This pass used an existing Chrome desktop browser session and a separate 390 x 844 responsive viewport. The responsive check is not a physical iOS or Android device. No password, verification code, OAuth consent, CAPTCHA, or private credential was entered or recorded.

The pass verifies authentication entry, redirects to provider-owned login hosts, responsive modal fit, logout, and dashboard configuration. It does not claim end-to-end signup or social-login completion.

## Browser Results

| Scenario | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Existing-session logout | Chrome desktop | Pass | Own profile opened, logout completed, Home returned to logged-out state, and confirmation status appeared |
| Login modal | Chrome desktop | Pass | Google, Kakao, and email choices rendered |
| Email login form | Chrome desktop | Pass | Email, password, login, signup switch, and reset controls rendered |
| Empty reset validation | Chrome desktop | Pass | User received a safe prompt to enter the reset email |
| Signup mode | Chrome desktop | Pass | Title and submit control changed to signup; login return control appeared |
| Google OAuth initiation | Chrome desktop | Pass | Navigation reached `accounts.google.com`; account choice and consent were not completed |
| Kakao OAuth initiation | Chrome desktop | Pass with scope finding | Navigation reached `accounts.kakao.com`; account login and consent were not completed |
| Responsive login modal | 390 x 844 responsive viewport | Pass | Modal stayed within 12 px side margins with no horizontal overflow; all three login choices were visible |

## Kakao Scope Finding

The deployed client appended `profile_nickname profile_image`, but Supabase Auth already supplies its built-in Kakao defaults. The observed request therefore contained duplicate profile scopes and `account_email`.

Supabase Auth currently hardcodes `account_email`, `profile_image`, and `profile_nickname` for its built-in Kakao provider, then appends any client-supplied scopes. The client fix removes its custom `scopes` option, eliminating duplicates while preserving the provider's supported default flow.

This does not remove `account_email` from the built-in Supabase Kakao request. The Supabase dashboard already has **Allow users without an email** enabled, so Kakao can still authenticate when no email is returned. Removing the email request entirely would require a separately reviewed Kakao ID-token/custom-provider architecture rather than a client scope option.

References:

- [Supabase Kakao login guide](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase Auth Kakao provider source](https://github.com/supabase/auth/blob/master/internal/api/provider/kakao.go)
- [Kakao authorization scope behavior](https://developers.kakao.com/docs/en/kakaologin/rest-api)

## Supabase Dashboard Audit

Read-only inspection confirmed:

- New user signups are enabled.
- Confirm email is enabled.
- Email, Google, and Kakao providers are enabled.
- Kakao **Allow users without an email** is enabled.
- Redirect allow list contains the `dev` branch URL and the Production Pages URL.
- The default Site URL was changed from localhost to `https://practice-week1-cws.pages.dev` after explicit approval.

No provider key or secret was copied into this document, repository, Notion, or chat.

Supabase confirmed the Site URL update with a success notification, and a fresh dashboard read showed the Production Pages origin. This removes the localhost fallback for email templates and unmatched redirects. The client also explicitly supplies the normalized branch or Production redirect for signup and password reset.

## Remaining End-To-End Checks

- Create a fresh email account, complete actual email receipt and confirmation link handling, then sign in.
- Request an actual password-reset email and recovery link, confirm the recovery session, and stop before the final password change unless separately approved.
- Complete final Google and Kakao consent and verify return to the intended branch alias.
- Repeat signup, reset, Google OAuth, Kakao OAuth, and logout on physical iOS Safari.
- Repeat the same flows on physical Android Chrome.
- Confirm OAuth initiated inside an embedded mobile browser shows or follows the expected safe handoff behavior.

## 2026-07-31 Kakao Production Revalidation

The current Supabase dashboard and Production site were checked again without exposing or changing provider credentials.

- Kakao is enabled in Supabase Auth and has provider credentials configured.
- **Allow users without an email** is enabled.
- The Supabase callback remains `https://pqczcponriukilrtpbdl.supabase.co/auth/v1/callback`.
- The Production login modal exposes **Kakao로 계속하기**.
- Starting Kakao login from Production reaches `accounts.kakao.com`.
- The OAuth request returns to `https://practice-week1-cws.pages.dev/` after the Supabase callback.
- No Kakao identity existed before this check, and no account password, consent, or new user creation was performed during QA.

One application gap was fixed: a Kakao account without an email could authenticate successfully but still be treated as unverified by upload and publish guards. Google and Kakao OAuth identities are now accepted as verified social accounts, while unconfirmed email/password accounts remain blocked.

## 2026-07-31 Linked Identity Profile Revalidation

The Google and Kakao identities for the tested email resolve to the same Supabase Auth user. The application now treats `public.profiles` as the canonical Ikkyee profile instead of rendering the latest OAuth provider metadata directly.

- The existing profile was backfilled once with nickname, bio, and avatar data.
- Future profile edits update the canonical profile row and are reused after either Google or Kakao login.
- An intentionally removed profile image remains removed instead of falling back to a provider image.
- Database verification confirmed that both linked identities reference the same profile row.
- `npm test` passed 440 tests and `npm run build` passed after the change.

## Launch Decision

The browser-verifiable portion passes after the redirect, duplicate-scope, and no-email Kakao account fixes. The checklist item **Run real-device authentication QA** remains open until physical-device, email-delivery, recovery-link, and final provider-consent checks are recorded.
