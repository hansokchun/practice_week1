# App Design Refresh - 2026-09-12

## Scope

Native Expo app presentation and navigation only. The deployed website,
photo visibility rules, storage, authentication providers, and billing are unchanged.

## Design Decisions

- Keep the shared Ikkyee logo and restrained teal accent on a near-white surface.
- Put discovery, map, own photos, likes, and profile in a persistent bottom menu.
  Hide it on focused detail, login, and settings routes, and while the keyboard is open.
- Reduce the main globe/search area to 178 points so photographs appear sooner.
  Use left-aligned section headings, consistent gutters, portrait images, and horizontal snapping.
- Use a compact map header, one search toolbar, and a clear selected-photo preview.
- Give photo details a compact back header, proportional image, author/title hierarchy,
  adjacent heart/count, and consistent map/street-view actions.
- Present profile identity first; open editing explicitly. Cancel restores the saved
  values, a failed save retains the draft, and a successful save returns to identity.
- Use an unframed two-column liked-photo gallery. Keep the existing photo and unlike actions.
- Distinguish Google, Kakao, and email on the login screen with the shared logo,
  provider icons, restrained colors, and visible email/password field labels.

## Verification

- Mobile tests: 376 passing across 102 suites, including navigation and profile editor tests.
- Existing web tests: 799 passing; web production build passes.
- TypeScript check passes.
- Expo export succeeds for iOS, Android, and web.
- Browser preview inspected at 320, 390, and 430 pixel widths.
- Visually checked main, map fallback, photo detail, guest profile, provider login,
  and email form. Confirmed main/map navigation and detail/login/back flow.

## Limits

Browser preview uses the existing map fallback, not the native Google Maps surface.
No real-device OAuth, native keyboard, or safe-area certification is claimed.
Signed-in profile save/cancel and likes behavior are covered by component tests;
no production user data was changed for this review.
Installed builds need a rebuilt app or a compatible development session to show
these changes; deploying the website does not update an installed native binary.
