# Ikkyee Authentication Preview QA

**Date:** 2026-07-26  
**Environment:** `https://dev.practice-week1-cws.pages.dev`  
**Status:** Pass; fresh email, Google, and Kakao sign-up checks completed

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

## 2026-07-31 Kakao Profile Import Choice

Kakao OAuth records the initiating provider for the duration of the redirect. When the user returns, the app reads the linked Kakao identity directly and offers a preview before changing the canonical Ikkyee profile.

- **카카오 프로필 적용** saves the Kakao name and available avatar while preserving the existing Ikkyee bio.
- **현재 프로필 유지** closes the prompt without changing saved profile data.
- Missing Kakao values do not erase existing profile values.
- The prompt is consumed once per Kakao login return and is not shown after Google or email login.
- Desktop and 390 x 844 responsive layouts kept the preview and both actions inside the viewport.
- `npm test` passed 444 tests and `npm run build` passed after the change.

## 2026-07-31 Physical Mobile Kakao Finding

Physical-device testing found that choosing KakaoTalk app login could return to the site without completing the Supabase callback, while entering the Kakao account credentials in the browser completed login successfully.

- Supabase Auth logs confirmed the successful browser credential flow, callback, and subsequent `/user` requests.
- The profile-import marker used tab-scoped session storage, so a mobile app or new-tab handoff could also suppress the Kakao profile choice after a successful return.
- The marker now uses a cross-tab local-storage record with a 15-minute expiry and is consumed once.
- Mobile Kakao OAuth requests use Kakao's supported `prompt=login` option to keep authentication in the browser and avoid the unreliable native-app handoff.
- Desktop Kakao and Google OAuth behavior is unchanged.
- `npm test` passed 447 tests and `npm run build` passed after the change.
- Physical-device Kakao login, profile choice, logout, and second login still require a post-deployment retest before this QA item can pass.

## Launch Decision

The browser-verifiable portion passed after the redirect, duplicate-scope, and no-email Kakao account fixes. The remaining physical-device, email-delivery, recovery-link, and final provider-consent checks were subsequently completed.

## 2026-08-10 Fresh Email Verification Passed

- A fresh email account completed sign-up on the deployed site.
- The confirmation message arrived in the user's inbox.
- Opening the verification link returned safely to the site.
- The verified account successfully signed in.
- Existing-account Google, Kakao, logout, and password-recovery checks also pass.
- A separate controlled check with never-used Google and Kakao accounts is still required before the authentication gate is complete.

## 2026-08-10 Fresh Social Sign-up Baseline

- The client uses Supabase `signInWithOAuth` for both login and first-time automatic account creation.
- Aggregate database evidence contains one Google-only account and one Google-plus-Kakao linked account.
- There is no Kakao-only account, and the existing records do not prove a controlled first-time sign-up test for both providers.
- Test accounts must use provider email addresses not already present in Ikkyee; matching existing addresses may exercise account linking instead of new account creation.
- Keep the created test accounts until Supabase Auth logs and the new empty-profile behavior are verified.

## 2026-08-10 Fresh Google Sign-up Passed

- A Google account not previously used with Ikkyee completed OAuth on Preview.
- The OAuth return created and signed in the new Supabase user automatically.
- The user returned to the application and confirmed the signed-in state.
- Fresh Kakao sign-up was completed in the following controlled check.

## 2026-08-10 Fresh Kakao Sign-up Passed

- A Kakao account not previously used with Ikkyee completed OAuth on Preview.
- The OAuth return created and signed in a Kakao-only Supabase user automatically.
- Aggregate identity evidence now contains one Kakao-only user, in addition to the previously linked Google-and-Kakao user.
- The user returned to the application and confirmed the signed-in state.
- Fresh email, Google, and Kakao sign-up coverage is now complete.

## 2026-08-10 KakaoTalk Link Handling

- Public Ikkyee links remain readable in embedded browsers without requiring login.
- Google and Kakao OAuth initiation is blocked inside known embedded app browsers and tells the user to reopen the page in Safari or Chrome.
- The app shell includes a stable Open Graph preview for copied links shared through KakaoTalk and other messaging services.
- Kakao Developers app `1477443` now displays the app name `Ikkyee` instead of `Travellog`.
- Product Link web domains include Production and Preview, with Production selected as the default.
- The default JavaScript key allows the Production and Preview domains for the Kakao JavaScript SDK.
- Album share actions now lazy-load the pinned Kakao JavaScript SDK and open the KakaoTalk share picker with the current public album URL.
- The browser JavaScript key is intentionally public and is restricted by the registered Production and Preview SDK domains.
- If the SDK or share picker is unavailable, the action falls back to copying the same album URL.

## 2026-08-10 Redirect And Cross-tab Revalidation

- Supabase's current JavaScript API requires `emailRedirectTo` inside email signup options. The client now maps the normalized Ikkyee redirect to that field instead of passing the OAuth-only `redirectTo` field.
- A fresh Preview Kakao request reached `accounts.kakao.com` with the Supabase project callback at `/auth/v1/callback` and returned to `https://dev.practice-week1-cws.pages.dev/`.
- The request contained `account_email`, `profile_image`, and `profile_nickname` once each; no duplicate client scopes were present.
- Supabase Auth logs showed successful Kakao `/authorize` redirects with HTTP 302 and no provider-configuration error during the check.
- Pending navigation and follow-up context now use local storage with a 15-minute expiry, so a Kakao app or new-tab return can restore the intended page without reviving stale login actions.
- Stored context contains only route, visibility, album ID, and supported follow-up action values. It does not contain credentials, access tokens, refresh tokens, or profile data.

The browser-owned account login and consent step was not submitted during this particular automated check. It was subsequently completed on a physical mobile device.

## 2026-07-31 Password Recovery Finding

Production successfully sent a password recovery email and returned the user to the site, but the application did not expose a new-password form because it had no recovery callback UI.

- Production UI and Supabase logs confirmed `/recover` 200, `user_recovery_requested`, and recovery `mail.send`.
- The app now detects Supabase implicit-flow callbacks with `type=recovery` before the SDK consumes the URL hash.
- A dedicated modal requires an eight-character password and matching confirmation before calling `updateUser({ password })`.
- Successful changes sign the recovery session out and return the user to the login entry.
- The callback helper, UI contract, validation wiring, 450-test suite, build, and local callback-modal behavior pass.
- A fresh Production recovery email and physical-device callback retest subsequently passed.
