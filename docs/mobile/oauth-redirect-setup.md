# Mobile OAuth Redirect Setup

**Last checked:** 2026-08-24  
**App scheme:** `ikkyee`  
**Callback route:** `ikkyee://auth/callback`

This document records console-only work that cannot be proven by the client repository. Provider client secrets must remain in the provider and Supabase dashboards or approved secret storage; they must never be added to Expo public environment variables or the mobile bundle.

## Supabase Auth

1. Enable Google and Kakao in Authentication > Providers using their server-side client credentials.
2. Add `ikkyee://auth/callback` to the Auth redirect allow-list. A development wildcard such as `ikkyee://**` may be used only when its scope and environment are explicitly approved.
3. Keep manual identity linking disabled until the canonical-profile linking flow and conflict UX have been approved and tested. Automatic linking only applies when Supabase can safely match a verified email.
4. Verify the final production project uses the same callback route before creating signed builds.

## Google Auth Platform

1. Configure the Supabase project callback URL shown by the Google provider page as an authorized redirect URI. This is the Supabase `/auth/v1/callback` URL, not the `ikkyee://` application URL.
2. Configure `openid`, `userinfo.email`, and `userinfo.profile`; do not request unrelated sensitive scopes.
3. Confirm the consent-screen audience, app name, support contact, privacy URL, and production status.

## Kakao Developers

1. Configure the Supabase project callback URL as the Kakao Login redirect URI.
2. Enable Kakao Login and approve only the required consent items: `profile_nickname`, `profile_image`, and `account_email` when the product requires email matching.
3. If `account_email` is unavailable, decide explicitly whether Supabase may allow Kakao users without an email; do not assume automatic account linking will work.
4. Verify the REST API key/client secret are stored only in the provider and Supabase configuration.

## Physical-device Evidence

Run each case on a signed iOS and Android development build:

- Google success, cancellation, provider denial, and return to `/auth/callback`.
- Kakao success, cancellation, provider denial, and return to `/auth/callback`.
- Cold-start and warm-app callback delivery.
- Existing verified-email account behavior and identity list after provider sign-in.
- Session persistence after restart and current-device logout.
- A rejected callback not present in the Supabase allow-list.

Record device/OS/build, provider, result, and sanitized screenshots or logs. Never record authorization codes, access tokens, refresh tokens, email addresses, or provider secrets.
