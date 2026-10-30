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
| 체험 사진 선택 면 | `--photo-trial-picker-surface` | `#e6f1e3` | — | 지도 만들기 첫 화면의 녹색 사진 선택 영역 |
| 체험 사진 선택 호버 | `--photo-trial-picker-hover` | `#dbead7` | — | 사진 선택 영역의 호버·파일 드래그 상태 |
| 체험 사진 선택 글씨 | `--photo-trial-picker-ink` | `#2d623f` | — | 사진 선택 제목·안내·테두리 |
| 체험 사진 선택 아이콘 | `--photo-trial-picker-accent` | `#3c7a4c` | — | 흰색 사진 아이콘의 녹색 바탕 |
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
- 상단 영문 이름 `Ikkyee`는 이전 Cormorant Garamond 세리프·700 굵기·1.14em 크기와 공통 0.02em 자간으로 복원한다. 한국어 부제·장식 글씨·푸터는 기존 Pretendard를 유지하며 고정 브랜드 심볼 파일은 바꾸지 않는다.
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
| `--photo-contribution-frame` | `#ffffff` | Existing illustration photo frames; opaque white under the real-photo overlays |

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
- **스타일(2026-10-30)**: 첫 사진 안내는 기존 `--surface-soft`와 44px 닫기 버튼을 유지한다. 섹션 사이 홍보는 흰색 면·얇은 `--line` 테두리 위에 `당신의 장소도 들려주세요` 제목, `사진 한 장으로, 나만의 장소를 공유해요.` 부제, 54px 업로드 버튼 순으로 표시한다. 제목 위의 작은 문구와 장황한 설명은 제거한다. 제목은 26–34px/600, 부제는 16px이며 기존 보조색을 본문색과 섞어 대비를 확보한다. 오른쪽은 기울어진 평면 서울 지도 위에 산·아파트·남산타워만 드문드문 입체로 표현한 v2 장식을 사용한다. 두꺼운 지도판과 단단한 바깥 테두리 없이 지도 가장자리는 부드럽게 흐려지며 투명해진다. 일반 핀 3개의 사진은 유명 관광지 대신 골목·작은 카페·주택가 계단을 표현한다. 실제 지도 캡처·사용자 사진·브랜드 원본은 수정하지 않는다. 데스크톱은 40px/48px 패딩과 최대 480px 이미지 열, 태블릿은 280px 이미지 열을 사용한다. 600px 이하에서는 문구 아래에 높이 220px 이미지를 유지하고 28px/24px 패딩·전체 폭 버튼을 사용한다. 한국어 단어 줄바꿈·기존 초점선·버튼 애니메이션을 유지한다. 이미지는 1152×768 투명 WebP, 227,074바이트이며 지연 로딩한다. 생성 프롬프트·출력 사양은 `images/seoul-photo-map-v2.source.json`에 기록하고 v1은 이전 자료로 보존한다.
- **컴팩트 패널·실제 사진(2026-10-30 후속)**: 롤백한 v2 지도·입체 장식·핀·기존 구도를 유지하고 `seoul-photo-map-v2.webp` 원본은 바꾸지 않는다. 그 위 기존 사진 프레임 세 칸에만 공개 라이선스 실제 거리·카페 사진을 비례 DOM 이미지로 덮는다. 1152×768 그림 좌표에서 북촌 `(236,143,160,125)`, 대오서점 `(854,170,137,119)`, 이화동 `(639,351,166,134)` 위치를 사용한다. 프레임 면은 흰색으로 불투명하게 덮고 전체 4:3 사진을 contain으로 표시해 원래 색·전체 구도·워터마크를 유지한다. 이 좌표는 장식 그림의 사진 칸이며 실제 지리 좌표를 의미하지 않는다. 기존 v2 지도를 실제 지도 레이어로 재구성하지 않는다. 사진은 160×120 WebP로 최적화하고 지도와 사진 총량을 250KiB 이하로 유지한다. 패널의 세로 패딩은 데스크톱·태블릿 24px, 모바일 20px로 줄인다. 가로 패딩은 기존 48px·32px·24px를 유지한다. 그림 영역 높이는 데스크톱 260px·태블릿 210px·모바일 180px, 내부 3:2 스테이지 폭은 390px·315px·270px와 max-width:100%를 사용한다. 모바일 간격은 16px다. 제목·설명·54px 사진 올려보기 버튼·이동 동작은 유지한다. 출처는 그림 오른쪽 아래의 44px 정보 링크(기존 Material Symbols info, 18px, 본문 대비의 보조색)로 제공하며 패널 높이를 더하지 않는다. 장식 그림만 aria-hidden으로, 출처 링크는 그 밖에 둔다. 정적 사진 출처 페이지는 한글 단어와 짧은 라이선스명을 묶어 줄바꿈한다.
- **골목 사진·정보 아이콘 후속**: 왼쪽 사진 칸만 실제 강화도 작은 골목 사진(CC0)으로 바꾼다. 기존 지도·다른 두 사진·프레임 위치·패널 크기는 유지한다. 그림 옆 정보 아이콘과 해당 전용 스타일은 제거하고 사진 출처는 기존 사이트 하단 내비게이션의 `사진 출처` 텍스트 링크로 제공한다. 링크는 기존 푸터의 글씨·간격·호버·초점 상태를 재사용하며 별도 장식을 추가하지 않는다.
- **사진 출처 문서 링크**: 기존 문서 스타일의 `--pine` 링크를 유지하고, 호버는 `--ink`와 두꺼운 밑줄, 누름은 `--ink`와 `--line` 배경으로 표시한다. 기존 초점선을 유지하고 문장 흐름이나 링크 크기는 바꾸지 않는다.
- **Button motion**: The landing entry and inline upload button share the decorative pin/leaf/trail SVG. While hovered with an available fine pointer or keyboard-focused, a shared four-second cycle draws it during the first 1.35 seconds, holds the complete symbol, and fades before repeating. Use `any-hover` / `any-pointer` so an attached mouse works on touch-first computers too. Leaving shows the complete static mark. Reduced-motion remains static and navigation is immediate. Declare named animation shorthands on active selectors so production CSS minification preserves timing. The production-build regression test checks the shared repeating cadence for all four parts and both interactions; verify actual mouse entry, held hover and re-entry on the deployed page.
- **Completion**: Successful upload opens the owner's profile main view. Its metrics and map reflect actual saved private photos; unlocated photos remain available through the photo tab and existing location notices. The older completion route remains compatible but is no longer the upload destination.

### Three-Photo Guest Trial

- **진입(2026-10-30)**: 비회원은 지도 아이콘의 `나만의 지도 만들기`, 회원은 카메라 아이콘의 `사진 추가`를 유지한다. 선택한 1번 시안에 따라 상단 버튼은 `--action-soft` 바탕·청록 글씨·얇은 테두리·그림자 없음으로, 로그인은 흰색 보조 버튼으로 표시한다. 기존 안내 팝업과 닫기·재노출 로직은 제거한다. 세션이 확인된 비회원에게만 지도 만들기 버튼 오른쪽 위에 숫자 없는 빨간 점을 표시한다. 회원 알림 버튼은 빨간 숫자 배지를 사용하며 0개는 숨기고 1~8은 그대로, 9개 이상도 `8`까지만 표시한다. 접근성 이름에는 실제 수를 유지한다. 공통 `.btn-primary`와 본문 버튼은 변경하지 않는다.
- **좁은 헤더(2026-10-30)**: 비회원은 빈 계정 래퍼를 숨기고 기존 44px 지도 버튼을 유지한다. 로그인한 520px 이하 화면에서는 부제 `장소 저장소`를 숨겨 사진 추가·알림·프로필과 겹치지 않게 한다. 360px 이하 회원 화면은 프로필 화살표도 숨기되 영문 `Ikkyee` 이름과 세 버튼은 유지한다. 숫자 없는 빨간 점은 모바일에서 글자를 숨기는 선택자에 가려지지 않아야 한다.
- **단계 안내 후속 조정(2026-10-30)**: 세 개의 번호·아이콘·문구와 전체 단계 구조는 유지하되 모든 단계는 투명한 면·테두리와 차분한 글씨를 사용한다. 현재 단계는 숫자의 옅은 회색 바탕과 작은 상태 글씨로만 구분해 사진 선택보다 눈에 띄지 않게 한다. 반복되는 바깥 카드 면과 실행 영역의 상자를 제거한다. 초기 사진 선택 버튼은 기존 업로드 첫 화면의 큰 점선 박스 구조를 재사용하되 밝은 녹색 면·녹색 사진 아이콘·굵은 제목으로 가장 먼저 보이게 한다. 선택/끌어놓기 안내·기본 비공개 칩을 유지한다. 모달 내부 로고·서비스명과 `사진을 골라 내 지도에 놓아보세요.` 문구는 제거하고 기능 제목만 남긴다. 0/3 카운터는 박스 오른쪽 위에, 사진 선택 후에는 기존 작은 추가 버튼 옆에 표시한다. 사진 선택 후 기존 편집·지도·저장 화면은 그대로 유지한다.
- **단계 정렬·제목 보강(2026-10-30)**: 단계 번호·아이콘 크기와 칸 패딩을 공통 변수로 관리하고 같은 행 중심에 맞춘다. 전체 폭의 고정 비율 연결선 대신 각 단계 번호에서 다음 단계로 이어지는 점선을 사용한다. 모바일은 번호 중심을 따라 세로로 잇고 설명은 제목과 같은 그리드 열에서 시작한다. 마지막 단계 뒤에는 선을 그리지 않는다. 초기 기능 제목은 기존 Pretendard를 유지하되 데스크톱 30px/750·모바일 24px/750으로 제목 위계를 강화한다. 선택 후 편집 화면의 제목은 기존 크기를 유지한다.
- **Copy-only deletion boundary**: Preserve the dialog header, body, footer frame, intro cards, photo/metadata panels, map, and upload/auth surfaces across the flow. The authorized density change reduces only the empty footer to a 20px divider/endcap with 8px vertical padding and compact safe-area clearance; its unavailable save action remains hidden. The selected editor retains the existing footer padding, 56px minimum height and right-aligned save action. Only the explicitly requested separate header trial action and whole-draft clear action are removed; per-photo deletion and location controls remain. Deleted prose does not return as replacement marketing text or invisible placeholder strings.
- **Privacy and continuity**: Use bounded IndexedDB drafts so files and chosen positions survive same-browser OAuth redirects. Expired drafts are removed on the next read. Let users remove individual photos. The photo dialog proceeds to upload review before requiring an account; the final upload action opens authentication if needed, resumes the selected originals and positions, and routes to the owner's profile after successful private persistence.
- **Anatomy and layout**: The dialog is at most 1000px wide, with 24px padding/gaps, a 28px heading, 16px body and 14px metadata. Its header and footer stay outside one scrolling body; the body uses a two-column photo/map workspace, stacking below 860px. Use an existing 4:3 photo frame, a map at least 280px high and a 44px minimum target for every action. Mobile uses 16px gutters and safe-area footer padding. Keep Korean phrases together.
- **Style and motion**: Follow `--bg`, `--surface`, `--surface-soft`, `--line`, `--text`, `--muted`, `--teal`, the current Pretendard stack and Material Symbols. Use a 16px dialog radius and the existing modal backdrop. New UI is static; focus-visible retains a 2px teal ring with 4px offset. Load the existing Google map only after the explicit map action, and show just the selected trial photo's pin. Location edits update the browser draft; account upload preserves those edits and starts private.

### Admin Site Overview

- Existing `admin-accounts` is the single operations hub; do not create a public analytics dashboard. Recheck the current admin account on the server for each aggregate read. Clear rendered aggregates on route exit, logout, account changes or lost admin access; ignore delayed responses.
- Above the account directory, reuse `--surface`, `--bg`, `--line`, `--text`, `--muted`, `--teal`, Pretendard and existing 8px corners. Use a quiet heading, a 44px refresh action, four responsive metric columns (two on phones), a visible-duration summary, an external Cloudflare traffic-report link and a seven-day table with 44px rows. Titles are 20–24px, numbers 26px, labels/help 14–16px, with 16/24px spacing. Do not infer real-time presence from last login or invent visitor totals.
- Counts use actual admin aggregates; registered accounts exclude anonymous sessions and include administrators. New-registration and photo totals use rolling 7/30-day windows; the trend and duration use KST calendar dates. Zero duration samples display an honest pending state. Cloudflare visits remain approximate entries, not exact people.
- The analytics privacy notice reuses existing legal typography; preserve Korean words and keep its short reference-link labels together. Split purpose/collection and storage/retention into separate paragraphs.
- Initial loading reuses the metric/duration/seven-row-table geometry with dash placeholders, hidden from assistive reading while the heading status announces loading. Refresh keeps settled data in place, including temporary failures; the heading status reports the outcome. Metadata notes reserve two lines. Refresh hover/press use existing soft/muted surfaces; footer press uses the soft surface with deep-teal ink, without moving either control.
- The trend table uses fixed columns (50% date, 25% per count) so placeholders do not move its headings. At 860px and below, new overview supporting copy, metric labels/notes/table, photo captions and footer secondary text/links are 15px; footer link targets are at least 44px wide and tall. Keep the short duration limit clause together.
- Duration only measures visible public screens of an eligible production document, capped at 60 minutes and submitted once when the document ends or enters a private route. Hidden intervals are excluded; interrupted browser closes can be missed. No persistent visitor/account identifiers, content IDs, positions or search terms are recorded. Store daily counts/totals with a 10,000-sample daily cap; rows more than 90 days old are pruned on the first accepted sample of a new date. No new paid analytics provider. Keep metric-note label/count phrases together on narrow screens.

### Admin Account Photo Inspection

- The existing account detail shows the latest 12 signed thumbnail derivatives in a responsive grid with 96px square previews and 12px gaps. Use the shared thumbnail radius and existing surface/text tokens; the document keeps scroll ownership.
- Every figure has a visible short title, a separate 공개/링크공개/비공개 label and a 14px desktop/15px mobile upload date. Long titles wrap for two lines with their full text available in the title attribute. Missing titles, dates and previews keep readable fallback labels. Preserve lazy image loading and descriptive alt text; no automatic original-image or location requests.
- **2026-10-31 owner-requested inspection**: The operations hub adds a latest-upload section between overview and account directory. Use the existing bordered white section, 24px desktop/16px mobile padding, 24px/20px heading, 4:3 photo frames, four columns above1100px, three above860px and two on phones, and 16px grid gaps. Metadata is14px desktop/15px narrow with short titles and explicit visibility, upload time and owner. Controls are44px minimum with existing soft/muted hover/press and teal focus rings. No new palette, font, animation or dependencies.
- Reserve56px for owner names, clamp them to two lines with the complete name in the accessible text/title, and keep date and time as separate nonbreaking groups. Short and long identities retain aligned photo actions on phones.
- Fetch only12 derivatives per page, newest first. KST date input and selected-account chip combine as filters; complete reset clears both. Clicking a daily photo count opens that date's photos, and clicking an account's complete-photo action opens all that account's photos. Scroll targets keep a header-height plus24px inset so their headings remain visible. The daily table keeps44px rows. Distinguish loading, no matches and retryable failures without showing another filter's old results.
- Each photo offers an explicit stored-original action. Only that action requests a60-second signed URL for the DB-owned server file. The native dialog uses the existing16px radius, surface, divider,24px/16px padding, a constrained1000px maximum width, viewport-safe scrolling and44px close target; keep original pixels contained without cropping. Provide loading/error states and an explicit no-referrer new-tab link. Say '저장된 원본': upload optimization may have changed the camera file. Closing, navigation, logout or role/account changes clear the original image/link and invalidate pending responses. No bulk original loading or public original endpoint.

### Primary and Secondary Buttons

- **Structure**: Native `button` with `.btn-primary`, `.btn-secondary`, `.nav-action`, or feature-specific action class.
- **Variants**: Primary teal fill, secondary white/translucent fill, danger secondary, editorial pill action.
- **Spacing**: 42px minimum height for app actions, 44-48px for editorial CTA pills.
- **States**: Default, disabled, hover where the existing selector family provides it, focus through browser-visible focus.
- **Accessibility**: Use visible text, not icon-only labels, unless a tooltip or accessible name exists.
- **Motion**: Keep button motion to transform and opacity.

### Site Footer

- **Structure and copy**: A compact global footer follows the app pages. Keep the `site-footer-title` brand heading, one short discovery/save/share tagline and a copyright line. Group the seven existing destinations into named `둘러보기` and `안내 및 정책` navigation landmarks with native lists. Privacy guidance lives at the existing policy destination instead of repeating three sentences in the footer.
- **Surface and type**: Use the warm `--bg` canvas with one thin `--line` top divider, `--teal` brand heading and `--text` links. Supporting text mixes 85% `--muted` with `--text` for readable small copy. Keep Pretendard: heading 24px/600, descriptor and other copy 14px desktop/15px mobile; links use 500 weight and copy uses 1.7 line height. No new images, shadows, gradients or motion.
- **Layout and access**: Desktop places the brand beside two wrapping link rows with a 24px column gap; copyright spans the full width below with a 16px row gap. Use 32px top and 24px bottom padding with existing container-aligned gutters. At 860px and below, stack the brand and navigation with a 20px gap and 24px/16px outer padding. Links keep 44px minimum width/height, 24px horizontal separation, underline on hover/focus and a 2px teal keyboard focus ring with 4px offset. A press uses the soft surface and deep-teal ink. Preserve Korean word groups, the existing Explore exclusion and Home's 104px plus safe-area bottom clearance for the floating map action. No accepted footer accessibility debt.

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

The site footer uses the warm `--bg` canvas and a thin `--line` divider. Restrained typography and grouped text links distinguish global site information without adding another promotional band.
