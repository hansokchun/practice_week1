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
| Accent/warm | `--coral` | `#f48c71` | `#ffb39f` | Warm highlights |
| Accent/gold | `--gold` | `#c9a050` | `#dfc276` | Rare archival emphasis |
| Border/default | `--line` | `rgba(26, 77, 78, 0.14)` | `rgba(249, 247, 242, 0.16)` | Dividers and outlines |
| Feature/houses surface | `--houses-surface` | `var(--bg)` | `var(--bg)` | Ikkyee top intro band |
| Feature/houses word | `--houses-word` | `rgba(26, 77, 78, 0.16)` | `rgba(26, 77, 78, 0.16)` | Oversized Ikkyee word |
| Feature/houses text | `--houses-text` | `var(--text)` | `var(--text)` | Houses intro copy |

### Rules

- Teal remains the main product accent for navigation, maps, and primary commands.
- Warm feature colors are reserved for editorial landing sections, not app dashboards.
- Add a token here before adding any new semantic color to CSS.

## 3. Typography

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

- Primary: `Inter`, `Pretendard`, system sans-serif.
- Serif: Georgia and Times New Roman only for the brand wordmark and editorial feature words.
- Icon: Material Symbols Outlined.

### Rules

- Korean copy must keep comfortable line height and avoid compressed letter spacing.
- Use serif only for deliberate editorial moments or the brand mark.
- Body text stays at 14px or larger.

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

### Grid

- Max content width: `--container` = `1280px`.
- Header height: 64px in active CSS, with `--header-height` retained for older surfaces.
- Breakpoints: mobile rules currently pivot at 860px.

### Rules

- Landing bands may use full-width compositions; dashboard and form surfaces stay within the container.
- Fixed-format visual features must declare stable heights, widths, or aspect ratios at desktop and mobile.

## 5. Components

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

- **Structure**: Public Explore and profile maps use the shared `getExploreMapOptions` helper.
- **Map Styling**: Embedded Google Maps JSON styling hides non-essential POI, transit, road, and neighborhood labels, and removes transit line geometry so uploaded photo pins remain the visual focus.
- **Controls**: Search, photo-scope filters, discovery panels, and pin previews sit on warm white elevated surfaces with teal-dark actions, coral metadata accents, and restrained media shadows so Explore feels connected to the landing feature rows. Large map panels use squared archive corners around 8-10px rather than soft rounded cards.
- **Discovery Cards**: Public photo cards show the image first, then one concise story/title line and relative time metadata. Explore photo thumbnails use square image corners and preserve each source image ratio so no photo content is visually clipped.

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
