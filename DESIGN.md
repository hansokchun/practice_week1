# Ikkyee Design System

## 1. Atmosphere & Identity

Ikkyee feels like a quiet travel archive: personal photographs become a map, and the product gives users enough structure to keep memories organized without making the interface feel like a social feed. The signature is editorial cartography, pairing restrained archive surfaces with oversized place-driven visual moments.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/primary | `--bg` | `#f9f7f2` | `#191c1c` | App background |
| Surface/elevated | `--surface` | `#ffffff` | `#1f2424` | Cards, panels, modals |
| Surface/soft | `--surface-soft` | `#edeeed` | `#2a3030` | Soft panels |
| Surface/muted | `--surface-muted` | `#e2e3e2` | `#343a3a` | Muted fields and placeholders |
| Text/primary | `--text` | `#191c1c` | `#f9f7f2` | Body and headings |
| Text/strong | `--ink` | `#050505` | `#ffffff` | Navigation and high-emphasis labels |
| Text/secondary | `--muted` | `#70787d` | `#a7b0b3` | Supporting copy |
| Accent/primary | `--teal` | `#1a4d4e` | `#6fb4b0` | Primary actions and map surfaces |
| Accent/deep | `--teal-dark` | `#003637` | `#9ad8d3` | Strong teal surfaces |
| 가벼운 동작 면 | `--action-soft` | `#eaf1ef` | — | 상단 메뉴·지도 탐색 패널의 연한 청록 버튼 |
| 가벼운 동작 호버 | `--action-soft-hover` | `#dce9e5` | — | 같은 버튼의 호버·열림 상태 |
| 알림 강조 | `--notification-red` | `#e53935` | — | 지도 만들기 점·최대 8의 알림 숫자 배지 |
| Accent/warm | `--coral` | `#f48c71` | `#ffb39f` | Warm highlights |
| Accent/gold | `--gold` | `#c9a050` | `#dfc276` | Rare archival emphasis |
| Border/default | `--line` | `rgba(26, 77, 78, 0.14)` | `rgba(249, 247, 242, 0.16)` | Dividers and outlines |
| Feature/houses surface | `--houses-surface` | `var(--bg)` | `var(--bg)` | Ikkyee top intro band |
| Feature/houses word | `--houses-word` | `rgba(26, 77, 78, 0.16)` | `rgba(26, 77, 78, 0.16)` | Oversized Ikkyee word |
| Feature/houses text | `--houses-text` | `var(--text)` | `var(--text)` | Houses intro copy |

### Rules

- Teal remains the main product accent for navigation, maps, and primary commands.
- Page canvases and the profile information area share `--bg`; elevated cards retain their surface tokens. Profile information follows nickname (32px below the cover edge), registered/public photo metrics, then biography. Landing section titles use a 16px left inset.
- The decorative Home globe uses multiply blending within the isolated discovery canvas so its pale image background follows the rendered canvas, including browser-forced dark colors. Keep its existing opacity and edge masks; photo cards and other imagery use ordinary compositing. No dark-mode detection or image inversion is needed.
- Warm feature colors are reserved for editorial landing sections, not app dashboards.
- Add a token here before adding any new semantic color to CSS.

## 3. Typography

- Default text tracking uses `--text-tracking: 0.02em` across page copy, headings and controls, including legal pages. Existing wider editorial tracking and icon fonts retain their own settings.

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display/editorial | `clamp(150px, 42vw, 660px)` | 400 | 0.86 | 0-0.015em | Oversized editorial words |
| Display | `clamp(54px, 9vw, 136px)` | 700-900 | 0.9-1.05 | 0 | Landing hero statements |
| H1 | `34px-48px` | 800-900 | 1.12-1.2 | 0 | Page titles |
| H2 | `26px-42px` | 800-900 | 1.18-1.24 | 0 | Section headers |
| H3 | `20px-24px` | 800 | 1.3 | 0 | Panel titles |
| Body/lg | `17px-21px` | 400-700 | 1.52-1.7 | 0 | Lead paragraphs |
| Body | `15px-16px` | 400-600 | 1.58-1.7 | 0 | Default text |
| Caption | `12px-14px` | 700-900 | 1.3-1.5 | 0.02em | Metadata, badges, labels |

### Font Stack

- Primary UI, headings, menus, descriptions, metadata, and standalone legal/support pages: `Pretendard Variable`, `Pretendard`, system sans-serif. Load the official v1.3.9 variable dynamic subsets so only needed glyph ranges download and all existing weights render consistently.
- Brand-only serif: Cormorant Garamond for the Ikkyee wordmark. Korean brand labels and decorative text follow the primary stack.
- Icon: Material Symbols Outlined.
- Landing-only display: self-hosted `Ikkyee Jua` (배달의민족 주아체 / Jua, Woowahan Brothers), 400 weight with `font-display: swap`. Use it for the landing headline, entry button, location caption and landing header actions; keep the fixed brand wordmark and icon font unchanged. The headline `여긴 어디서 찍은거지?` stays on one line at 320px and above using a 24–56px fluid scale. Other pages retain Pretendard.

### Rules

- Korean copy must keep comfortable line height and avoid compressed letter spacing.
- Use serif only for brand identity moments; page titles, section titles, menus, captions, and descriptions stay in the primary stack.
- Body text stays at 14px or larger.

### Reusable Korean Wordmark v2.1

- Standalone brand deliveries use the unchanged `brand/ikkyee-symbol-v1.png`, its full transparent padding and aspect ratio, teal `#245457` or the approved white alpha silhouette. They do not replace application branding automatically.
- `이끼` uses Pretendard SemiBold (600); `장소 저장소` uses Pretendard Medium (500). The horizontal layout places the descriptor above the larger name; the stacked layout places it below. Compact deliveries omit the descriptor for small contexts where the service is already identified.
- Authoring tokens live in `scripts/brand-wordmark-v2.mjs`: horizontal 1024 x 400, stacked 640 x 720, compact 560 x 220. Layout derives placement from actual glyph bounds and the master alpha bounds. Keep visible separation, center the combined artwork and preserve the entire symbol frame.
- Minimum displayed widths are 280px horizontal, 180px stacked and 104px compact. Previews use existing warm-white, deep-teal and text colors. Deliver transparent 1x/2x PNG and self-contained SVG with outlined type and embedded raster symbol; never describe the latter as a pure vector master.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Icon and compact inline gaps |
| `--space-2` | `8px` | Navigation and compact groups |
| `--space-3` | `12px` | Form and button inner rhythm |
| `--space-4` | `16px` | Mobile page margin |
| `--space-6` | `24px` | Default page gutters |
| `--space-8` | `32px` | Card and grid gaps |
| `--space-10` | `40px` | Section internals |
| `--space-12` | `48px` | Mobile section padding |
| `--space-16` | `64px` | Header and major rhythm |
| `--space-20` | `80px` | Large section padding |
| `--space-24` | `96px` | Maximum ordinary section separation |
| `--thumbnail-radius` | `8px` | Home and Explore photo thumbnail corners |

### Grid

- Max content width: `--container` = `1280px`.
- Header height: 64px in active CSS, with `--header-height` retained for older surfaces.
- Home header adds `--home-header-extra` = `12px` to the 64px shell height. Home search keeps its position within the content, while `--home-discovery-gap` = `56px` moves the globe and all following photo content down together. Mobile retains its sticky header and adds the same height without a main-content offset.
- Breakpoints: mobile rules currently pivot at 860px.

### Rules

- Landing bands may use full-width compositions; dashboard and form surfaces stay within the container.
- Fixed-format visual features must declare stable heights, widths, or aspect ratios at desktop and mobile.

## 5. Components

### Landing Region Search

- **Structure**: Keep the existing main search form. Submitting a city, region or country resolves its geographic bounds once, then filters already loaded public photo metadata. Typing and changing result pages make no geocoding requests. Existing topic suggestions remain local text searches.
- **Results**: Reuse landing photo cards in the existing gallery grid, with 24 thumbnails per page and previous/next controls. Search results exclude private and link-only photos; photos without coordinates stay available to text search but cannot match a geographic area.
- **States**: Empty input restores curated sections. Loading announces the search and prevents duplicate submissions; stale responses cannot replace a newer search. Show a concise resolved-region label, an honest map-area scope note, and distinct no-result or service-failure guidance. Preserve text matches if location lookup is unavailable.
- **Cost and privacy**: Reuse the existing Google Maps SDK without creating a new map. Geocoding runs only on explicit submission, with one request and a bounded timeout. Region responses remain in the active search memory only. Sign and load thumbnail variants only for the displayed page.
- **Combined queries**: Recognized trailing topics such as `제주 바다` and `서울 야경` filter the resolved region's photos locally. Keep multiword place names intact when the trailing word is ambiguous. Show the topic beside the region label, and distinguish an empty topic result from a region with no public photos. Changing only the topic reuses the currently resolved region without a new lookup; clearing or leaving that active region drops the reuse.
- **Style and accessibility**: Keep existing surface, typography, spacing, buttons and gallery tokens. Results use aria-busy and a polite live status. Compact provider attribution stays adjacent to the resolved place label; Google Maps text uses normal 14px sans-serif, 400 weight, normal tracking, nowrap and translate=no, with --text for contrast. No new motion.

### Account Welcome Guidance and Upload Location Note

- **Structure**: Two dismissible welcome entries in the existing account notifications: a friendly location reminder and an upload invitation that routes directly to `upload`. Auth and profile dialogs carry no warning block.
- **Content**: Explain public photo location exposure in friendly Korean and invite the first travel photo. The upload page repeats the location reminder in a small persistent note below its steps.
- **Style**: Notifications use one title line with ellipsis for overflow and the full title available on hover. Location-sharing guidance is included in its title. The upload note uses 14px/1.6 muted text, 12px padding, and Korean word-preserving wrapping. Dismiss targets are 44px. Profile menu buttons center their icons and labels vertically with balanced padding, including settings and logout.
- **Accessibility**: A separately named dismiss button beside each notice. The popover scrolls on short viewports. Dismissal is stored per account in this browser and remains until storage is cleared.

### Photo Contribution Invitations

- **First photo**: A dismissible Home invitation appears only for a signed-in member whose own photo library has loaded successfully and is empty. Loading, failed reads and guest browsing never count as an empty account. Dismissal is stored per account in this browser, separately from the upload location reminder.
- **Between sections**: One in-house invitation sits after the second visible topic section (between the first and second when only two are visible). Do not repeat it in every section or put it into search results. Its upload action uses the existing sign-in and pending-route flow.
- **Style**: Keep the first-photo notice compact on `--surface-soft`, with its separately named 44px dismiss target. The between-section invitation is an editorial white surface with a subtle `--line` border: a small teal introduction, a 26–34px/600 heading, 16px supporting copy, and a 54px upload button beneath. A decorative inline SVG pairs photo frames with a dotted route and pin, using existing palette tokens without media requests. Desktop uses 40px/48px padding and a 280px illustration column; tablet reduces the illustration to 180px. Below 600px, hide the illustration, use 28px/24px padding, and make the button full width. Keep Korean words together. Focus-visible uses a 2px `--teal` outline with a 4px offset. No entrance motion.
- **Button motion**: The landing entry and inline upload button share the decorative pin/leaf/trail SVG. While hovered with an available fine pointer or keyboard-focused, a shared four-second cycle draws it during the first 1.35 seconds, holds the complete symbol, and fades before repeating. Use `any-hover` / `any-pointer` so an attached mouse works on touch-first computers too. Leaving shows the complete static mark. Reduced-motion remains static and navigation is immediate. Declare named animation shorthands on active selectors so production CSS minification preserves timing. The production-build regression test checks the shared repeating cadence for all four parts and both interactions; verify actual mouse entry, held hover and re-entry on the deployed page.
- **Completion**: Successful upload opens the owner's profile main view. Its metrics and map reflect actual saved private photos; unlocated photos remain available through the photo tab and existing location notices. The older completion route remains compatible but is no longer the upload destination.

### Three-Photo Guest Trial

- **진입(2026-10-30)**: 비회원은 지도 아이콘의 `나만의 지도 만들기`, 회원은 카메라 아이콘의 `사진 추가`를 유지한다. 선택한 1번 시안에 따라 상단 버튼은 `--action-soft` 바탕·청록 글씨·얇은 테두리·그림자 없음으로, 로그인은 흰색 보조 버튼으로 표시한다. 기존 안내 팝업과 닫기·재노출 로직은 제거한다. 세션이 확인된 비회원에게만 지도 만들기 버튼 오른쪽 위에 숫자 없는 빨간 점을 표시한다. 회원 알림 버튼은 빨간 숫자 배지를 사용하며 0개는 숨기고 1~8은 그대로, 9개 이상도 `8`까지만 표시한다. 접근성 이름에는 실제 수를 유지한다. 공통 `.btn-primary`와 본문 버튼은 변경하지 않는다.
- **좁은 헤더(2026-10-30)**: 비회원은 빈 계정 래퍼를 숨기고 기존 44px 지도 버튼을 유지한다. 로그인한 520px 이하 화면에서는 부제 `장소 저장소`를 숨겨 사진 추가·알림·프로필과 겹치지 않게 한다. 360px 이하 회원 화면은 프로필 화살표도 숨기되 영문 `Ikkyee` 이름과 세 버튼은 유지한다. 숫자 없는 빨간 점은 모바일에서 글자를 숨기는 선택자에 가려지지 않아야 한다.
- **Progressive flow**: The dialog title is `나만의 지도 만들기`, matching the guest entry and guidance card. Keep all three step tiles, the photo picker and `0/3` counter. The empty dialog stays at most 760px while the selected editor retains its 1000px workspace. Use the approved symbol only in the empty header and leave the master asset unchanged. Use a 26px/600 initial desktop heading and a 22px compact heading for natural Korean wrapping. The supporting brand reads `Ikkyee · 장소 저장소`. The three tiles contain real `01`, `02`, `03` number spans, matching icons, the short labels (`사진 고르기`, `장소 확인`, `지도에 저장`) and one-line details. The actual first step uses `aria-current="step"`, a visible `현재 단계` badge, teal border, inset accent and stronger surface contrast so its priority is not communicated by color alone. Desktop uses three 134px cards with number, status, icon, label and detail rows; below 860px they become 80px stacked rows while preserving readable 13px details. Group the initial picker and count pill inside one elevated action surface, use a 220px/52px primary action on desktop and let it fill the available compact width. Do not add hover affordance or fake completion states to the informational tiles. Delete only the requested long explanatory/signup/privacy paragraphs, footer warning and clear-all action. Hide the intro after selection and show the existing thumbnail reel and photo/map workspace. Preserve the selected thumbnail with a tonal surface and `aria-pressed`, never an accent border. Picker/save icons and labels share centered inline-flex alignment and an 8px gap.
- **Copy-only deletion boundary**: Preserve the dialog header, body, footer frame, intro cards, photo/metadata panels, map, and upload/auth surfaces across the flow. The authorized density change reduces only the empty footer to a 20px divider/endcap with 8px vertical padding and compact safe-area clearance; its unavailable save action remains hidden. The selected editor retains the existing footer padding, 56px minimum height and right-aligned save action. Only the explicitly requested separate header trial action and whole-draft clear action are removed; per-photo deletion and location controls remain. Deleted prose does not return as replacement marketing text or invisible placeholder strings.
- **Privacy and continuity**: Use bounded IndexedDB drafts so files and chosen positions survive same-browser OAuth redirects. Expired drafts are removed on the next read. Let users remove individual photos. The photo dialog proceeds to upload review before requiring an account; the final upload action opens authentication if needed, resumes the selected originals and positions, and routes to the owner's profile after successful private persistence.
- **Anatomy and layout**: The dialog is at most 1000px wide, with 24px padding/gaps, a 28px heading, 16px body and 14px metadata. Its header and footer stay outside one scrolling body; the body uses a two-column photo/map workspace, stacking below 860px. Use an existing 4:3 photo frame, a map at least 280px high and a 44px minimum target for every action. Mobile uses 16px gutters and safe-area footer padding. Keep Korean phrases together.
- **Style and motion**: Follow `--bg`, `--surface`, `--surface-soft`, `--line`, `--text`, `--muted`, `--teal`, the current Pretendard stack and Material Symbols. Use a 16px dialog radius and the existing modal backdrop. New UI is static; focus-visible retains a 2px teal ring with 4px offset. Load the existing Google map only after the explicit map action, and show just the selected trial photo's pin. Location edits update the browser draft; account upload preserves those edits and starts private.

### Primary and Secondary Buttons

- **Structure**: Native `button` with `.btn-primary`, `.btn-secondary`, `.nav-action`, or feature-specific action class.
- **Variants**: Primary teal fill, secondary white/translucent fill, danger secondary, editorial pill action.
- **Spacing**: 42px minimum height for app actions, 44-48px for editorial CTA pills.
- **States**: Default, disabled, hover where the existing selector family provides it, focus through browser-visible focus.
- **Accessibility**: Use visible text, not icon-only labels, unless a tooltip or accessible name exists.
- **Motion**: Keep button motion to transform and opacity.

### White Landing Band

- **Structure**: Full-width section with `.white-band`.
- **Variants**: Standard white feature band and feature-specific color override.
- **Spacing**: Full width, container-derived side padding.
- **States**: Static content.
- **Accessibility**: Landmark section with an accessible heading.
- **Motion**: Static unless a feature owns its own scroll-safe animation.

### Feature Story Rows

- **Structure**: `.home-feature-stories` wrapper containing repeated `.home-feature-story` rows with left-aligned media and right-side concise copy.
- **Variants**: Map memory, travel flow, and Explore discovery rows.
- **Spacing**: Full-width white band with container-derived side padding; each row uses the same 78px desktop and 48px mobile vertical padding as the Explore guide section.
- **Media**: Feature screenshots stay unframed and use contained media, with image-only drop shadows for depth and no colored background plate behind the screenshot.
- **Explore row**: The third row carries the former Explore guide headline, explanatory copy, and Explore/upload actions so the standalone guide section is not repeated elsewhere on Home.
- **States**: Static public introduction content; hidden after login with the other public intro bands.
- **Accessibility**: Wrapper has a screen-reader heading; every media image has descriptive alt text and stable dimensions.
- **Motion**: Static media and copy; no layout animation.

### Quiet Explore Map

### Landing Admin Photo Dock

- Hero slides also accept local image files through an admin-only multi-file picker (maximum seven slides, existing 15MB validation and optimized original/thumbnail/preview uploads). The image preview sits above an editable location label. Adding files keeps drafts; saving publishes slide assignments and captions. Uploaded photos are stored as public photos with no inferred coordinates. Upload errors clean newly created storage objects; successful files remain available when a later file fails. The site owner's account alone is exempt from the 100-photo quota; other accounts, including other admins, retain the limit in both client and database.

- A single shared photo picker stays fixed at the bottom of the admin page; the document owns vertical scrolling and reserves space for the dock and mobile safe area.
- After a successful save, unused local hero uploads and their original/thumbnail/preview files are deleted. Active hero, section and album references are protected; ordinary uploaded photos remain independent. A cleanup failure is shown and retried on the next save. Dock and selected-photo thumbnails use the shared signed-URL recovery pipeline.
- Click or focus a section to choose its destination. A teal border and pressed destination button identify the active section; the dock repeats its title.
- Eight thumbnails per page, with previous/next controls, public/liked filters and search. Desktop uses one row; mobile uses four columns and two rows. Selected photos remain in their section with reorder/remove controls.
- Adding photos preserves text drafts. Already-added photos are marked and cannot be added twice. Save remains an explicit action.
- Use existing surface, line, teal and thumbnail tokens; keyboard selection and focus-visible states remain available. No new animation.

- **Structure**: Explore uses `getExploreMapOptions`; profile uses `getProfileMapOptions` with the same visual styling. Profile camera input is disabled (drag, touch, wheel, double click and keyboard); initial photo bounds still fit automatically.
- **Map Styling**: Embedded Google Maps JSON styling hides non-essential POI, transit, road, and neighborhood labels, and removes transit line geometry so uploaded photo pins remain the visual focus.
- **Controls**: Search, photo-scope filters, discovery panels, and pin previews sit on warm white elevated surfaces with teal-dark actions, coral metadata accents, and restrained media shadows so Explore feels connected to the landing feature rows. Large map panels use squared archive corners around 8-10px rather than soft rounded cards.
- **Discovery Cards**: Public photo cards in the Explore discovery panel render as image-only thumbnail entries. Each thumbnail fills the panel width in a consistent 4:3 frame, matching the default preview photo rhythm so the list scans evenly. Thumbnail corners use the shared 8px thumbnail radius, while description or relative-time metadata appears only after opening the photo preview.

### Home Photo Thumbnails

- **Structure**: Recent, liked, and personal photo thumbnails render as image-first archive tiles.
- **Shape**: Use `--thumbnail-radius` so Home photo grids match Explore discovery thumbnails without becoming pill-like or overly soft.
- **Motion**: Existing hover and selection states stay transform/opacity based and must not change thumbnail dimensions.

### Mobile Web Shell

- **Structure**: Mobile keeps the header as a compact brand/account bar and uses a two-item fixed bottom navigation for Home and Explore.
- **Pages**: Home, photo grids, upload, album creation, album detail, public trip, and profile collapse to one-column page flows with 16px side gutters.
- **Explore**: Mobile Explore stays map-first. Search and photo-source selection float over the map, while selected photo previews open as a bottom sheet above the bottom navigation.
- **Modals**: Utility modals become bottom sheets. Photo detail and fullscreen viewers remain full-screen so images can be inspected without rounded card edges.
- **Controls**: Mobile editing controls stay visible without hover, use full-width action rows where needed, and keep map-pick buttons reachable above safe-area navigation.
- **Rules**: Mobile page content must avoid horizontal overflow, preserve two-column thumbnail grids where useful, and leave room for safe-area bottom navigation.

### Houses Reference Band

- **Structure**: `.home-houses-reference` section with a decorative oversized word, centered copy, and absolutely positioned image collage with shadow depth.
- **Variants**: Single top-of-home feature.
- **Spacing**: Desktop top padding 140px; mobile top padding 84px.
- **Backdrop**: The section uses the houses surface with a soft bottom fade into the next white section; the collage itself should not sit on a separate blob, map grid, or plate.
- **States**: Photo captions reveal on hover and focus.
- **Accessibility**: Decorative word hidden with `aria-hidden`; section heading is screen-reader only; collage has a group label, individual image alt text, and location captions.
- **Motion**: Static collage, using transforms only for rotation/position.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 100-150ms | ease-out | Button press |
| Standard | 200-300ms | ease-in-out | Panel and control transitions |
| Emphasis | 400-640ms | cubic-bezier(0.2, 0.8, 0.2, 1) | Hero image slider |

### Rules

- Animate transform and opacity only.
- Respect reduced motion for any future non-essential animation.
- Hero slider and map pin updates must not reflow the page.

## 7. Depth & Surface

### Strategy

Ikkyee uses a mixed but restrained strategy: tonal-shift surfaces for app structure, subtle borders for clarity, and soft shadows only for elevated media, floating panels, and editorial photo cards.

| Level | Value | Usage |
| --- | --- | --- |
| App shadow | `--shadow` = `0 20px 60px rgba(26, 77, 78, 0.08)` | Panels and elevated surfaces |
| Media shadow | `0 30px 70px rgba(70, 40, 32, 0.22), 0 12px 28px rgba(26, 77, 78, 0.12)` | Houses reference collage |
| Hero shadow | `0 28px 80px rgba(26, 77, 78, 0.22)` | Hero photo/map card |

Borders use `--line` or a low-alpha color derived from the relevant section text color.

The site footer is the one allowed full-width dark teal surface on the landing flow, using `--teal-dark` to `--teal` with light text so it reads as global site information rather than another intro section.
