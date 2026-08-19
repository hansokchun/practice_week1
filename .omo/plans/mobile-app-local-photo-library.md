# mobile-app-local-photo-library - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** iPhone과 Android 앱이 Explore 지도와 공개 사진 탐색을 중심으로 열리고, 좋아요·댓글·공유·공개 프로필을 바로 사용할 수 있습니다. 내 휴대폰 사진의 조회·지도·위치 수정·선택 공개는 보조 기능으로 제공하며 여행 앨범은 앱에서 완전히 제외합니다.

**Why this approach:** Explore를 첫 화면과 핵심 흐름으로 두면 서비스의 발견·소셜 가치를 명확히 전달할 수 있습니다. 기기 사진과 공개 사진을 분리하면 서버 저장비를 줄이면서 개인정보 경계도 지킬 수 있습니다.

**What it will NOT do:** 앱에는 앨범 생성·조회·편집·공개·공유가 없습니다. 휴대폰 전체 사진을 자동으로 서버에 올리지 않으며, 기존 웹의 앨범 기능·화면·데이터도 변경하지 않습니다.

**Effort:** XL
**Risk:** High - 사진 권한과 변경 감지가 iOS·Android에서 다르고, 공개 업로드·OAuth·스토어 심사를 함께 맞춰야 합니다.
**Decisions to sanity-check:** 하단 `Explore · 내 사진 · 좋아요`, 상단 프로필 썸네일 진입, Explore 기본 화면, React Native + Expo Development Build, iOS/Android 동시 지원, 정지 사진 중심의 첫 출시 범위입니다.

Your next move: 계획대로 개발을 시작하거나, 구현 전에 이 계획을 고정밀 이중 검토합니다. Full execution detail follows below.

---

> TL;DR (machine): XL/high-risk 21-task Explore-first iOS+Android Expo plan with device-only personal media, shared Supabase photo/social parity, no mobile album surface, explicit publication outbox, compliance, and real-device release gates.

## Scope
### Must have
- `mobile/` 독립 Expo Development Build 앱: TypeScript, Expo Router, Expo SQLite, Expo MediaLibrary, Expo Image, React Native Maps, Supabase JS.
- 웹과 같은 Supabase 프로젝트·사용자·RLS를 공유하는 이메일/Google/Kakao/Apple 인증, 비밀번호 복구, 프로필.
- 로그인 없이도 쓰는 보조 사진 화면: 원본은 PhotoKit/MediaStore에만 두고 SQLite에는 자산 ID·시간·좌표·동기화 상태만 저장.
- 전체/제한/거부/회수 권한, 외부 삭제, iCloud 원본 지연, Android 볼륨 변화에 안전한 인덱싱·재조정.
- 앱 기본 진입인 Explore 지도·목록·상세와 좋아요·댓글·공개 프로필·공유.
- 보조 탭의 로컬 사진 그리드·상세·지도·위치 보정과 기존 클라우드 사진 관리.
- 사용자가 명시적으로 선택할 때만 `private|link|public` 클라우드 사본 생성. 공개 파생본, outbox, 멱등성, 재시도, 고아 파일 정리 포함.
- 좋아요한 사진 목록, 계정 삭제, 신고·차단·운영 대응.
- iOS/Android 실제 기기, 웹 회귀, RLS, 성능·접근성·스토어 정책까지 통과하는 출시 절차.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- 기기 사진 원본·전체 라이브러리의 자동 서버 업로드 또는 durable app-storage 복제.
- 모바일의 로컬·클라우드·공개 앨범 조회, 생성, 편집, 삭제, 링크, 공유 또는 앨범 관련 Supabase query/mutation.
- 기존 웹의 앨범 코드·화면·라우팅·테이블·데이터 변경 또는 삭제.
- 기기 전용 사진이 웹·다른 기기에서 보이거나 복구된다는 약속.
- 앱 종료 중 모든 플랫폼에서 실시간 변경 감지를 보장하는 기능.
- RAW·동영상 전체 지원 또는 OS 시스템 앨범 직접 관리.
- 서비스 역할 키, OAuth 비밀 키, 웹용 Google Maps 키를 앱 번들에 포함.

### Mobile-only change boundary
- Allowed implementation paths: `mobile/**`, `docs/mobile/**`, mobile-only test/config files, additive `supabase/config.toml`, `supabase/migrations/**`, additive `supabase/functions/**` required by app security or store policy.
- Protected browser-app paths with required zero diff: `index.html`, `style.css`, `auth.js`, `js/**`, `images/**`, `functions/**`, root Vite/Cloudflare behavior and existing web routes.
- Shared Supabase additions must be backward-compatible, nullable/additive where applicable, and must not change existing web query results, existing-table RLS behavior, album rows, or Storage object paths. 차단 필터는 모바일이 명시적으로 호출하는 신규 RPC에만 적용한다.
- Existing web tests/build are verification only. A failure must be fixed in mobile/backend additions without editing protected browser-app paths unless the user separately approves a web change.

## Verification strategy
> 자동 검증은 에이전트가 실행한다. 실물 기기 권한 승인, 개발자 계정·서명 자격 증명 제공, Play 권한 선언 제출, 최종 스토어 제출은 아래 Owner gate로 분리한다.
- Test decision: 동기화·로컬 DB·outbox·권한 상태는 TDD(Jest), 화면은 tests-after(React Native Testing Library), 사용자 흐름은 Maestro와 실제 기기 QA.
- Standard gate: `npm --prefix mobile run lint && npm --prefix mobile run typecheck && npm --prefix mobile test -- --runInBand && npm --prefix mobile run export:all && npm test && npm run build && npm run perf:budget`.
- Native gate: iOS/Android Development Build에서 `maestro test mobile/e2e`; full/limited/denied/revoked 권한, 외부 삭제, 프로세스 종료 중 업로드, 오프라인, 계정 전환을 각각 실행.
- Backend gate: Supabase 로컬/스테이징에서 migration 적용 후 owner/non-owner/anonymous RLS와 Storage 고아 정리 테스트.
- Performance budgets: iPhone 12/iOS 18.x TestFlight Release와 Pixel 6a/Android 15 internal Release에서 10,000장 fixture 최초 인덱싱 60초 이내, warm launch 2.5초 이내, foreground 증분 반영 3초 이내, 5,000핀 지도 pan 후 상호작용 1초 이내, 그리드 스크롤 중 메모리 350MB 이내, 썸네일 캐시 512MB 상한. Xcode Instruments와 Android Studio Profiler 측정 JSON을 보존하며 동일 기기를 구하지 못하면 대체 기기 승인을 Owner gate로 기록한다.
- Owner gates: Apple/Google/Kakao 앱 등록·콜백, iOS/Android 서명, 실물 기기 1대씩, 개인정보/지원 URL, Play broad-photo-access 선언, TestFlight/Play Console 최종 제출 승인.
- Evidence: <attemptDir>/task-<N>-mobile-app-local-photo-library.<ext> (attemptDir = currentAttemptDir from 'omo ulw-loop status --json', .omo/evidence/ulw/<session>/<goalId>/a<attempt>; outside ulw-loop use .omo/evidence/)

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- Wave 1, product and feasibility contracts: 1-5. Explore 중심 클릭 프로토타입을 먼저 승인한 뒤 실제 기기 접근성과 데이터·정책 경계를 확정한다.
- Wave 2, data engines: 6-10. 기기 미디어, 재조정, 모바일 Auth, 클라우드 저장소, 공개 outbox를 병렬 구축한다.
- Wave 3, Explore-first product: 11-16. Explore·소셜·좋아요 목록을 먼저 완성하고 내 사진과 클라우드 관리를 보조 흐름으로 연결한다.
- Wave 4, launch hardening: 17-21. 계정 삭제·UGC 안전·성능·교차 클라이언트·스토어 출시를 닫는다.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 2, 5, 11, 21 | - |
| 2 | 1 | 3, 4, 5, 8, 11 | - |
| 3 | 2 | 6, 15, 21 | 4, 5 |
| 4 | 2 | 6, 7, 10, 15, 16, 19 | 3, 5 |
| 5 | 1, 2 | 6, 8-10, 17-20 | 3, 4 |
| 6 | 3-5 | 7, 10, 15, 16 | 8 |
| 7 | 4, 6 | 15, 19 | 9, 10 |
| 8 | 2, 5 | 9-14, 16-18, 20 | 6 |
| 9 | 5, 8 | 11-14, 16, 18, 20 | 7, 10 |
| 10 | 4-6, 8 | 16, 19, 20 | 7, 9 |
| 11 | 1, 2, 8, 9 | 12-19, 21 | - |
| 12 | 8, 9, 11 | 13, 18-21 | 15 |
| 13 | 8, 9, 11, 12 | 14, 18-21 | 15, 16 |
| 14 | 8, 9, 11, 13 | 19-21 | 15, 16 |
| 15 | 3, 4, 6, 7, 11 | 16, 19-21 | 12-14 |
| 16 | 4, 6, 8-11, 15 | 19-21 | 13, 14 |
| 17 | 5, 8, 11 | 20, 21 | 18, 19 |
| 18 | 5, 8, 9, 11-13 | 20, 21 | 17, 19 |
| 19 | 4, 5, 7, 10-16 | 21 | 17, 18, 20 |
| 20 | 5, 8-10, 12-18 | 21 | 19 |
| 21 | 1, 3, 11-20 | Final verification | - |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Explore 중심 제품 구조와 클릭 프로토타입 승인
  What to do / Must NOT do: 하단 `Explore · 내 사진 · 좋아요`, 각 주요 화면 상단 오른쪽의 원형 프로필 썸네일, Explore 기본 진입, 지도 중심 탐색, 사진 상세·소셜 흐름, 보조 내 사진 흐름을 `docs/mobile/product-definition.md`와 배포에서 제외되는 `docs/mobile/prototype/index.html` 클릭 프로토타입으로 만든다. 프로필 썸네일은 약 36px이며 로그인 사용자는 프로필·설정 stack, 게스트는 로그인 화면을 연다. 390x844과 360x800 화면, 핵심 상태와 흐름을 포함하고 앨범 화면·탭·카드·행동을 넣거나 기존 웹 UI를 수정하지 않는다.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 2, 5, 11, 21
  References: `.omo/plans/mobile-app-local-photo-library-simple-ko.md`; `index.html:117-579`; `style.css`; `js/app-sections.mjs:1-35`; `docs/spec.md:15-21`.
  Acceptance criteria: 시작 시 `git rev-parse HEAD` 결과를 `docs/mobile/web-baseline.txt`에 기록한다. 프로토타입은 Vite/Cloudflare build 입력에 포함되지 않고 기본 진입, 세 하단 탭, 상단 프로필 진입, empty/loading/error/offline, 핵심 흐름을 클릭할 수 있으며 앨범 UI가 0개다. 사용자 승인 날짜와 승인한 화면 버전을 `docs/mobile/product-definition.md`에 기록.
  QA scenarios: 새 사용자 앱 실행→Explore 지도→상단 기본 사용자 아이콘→로그인→프로필 썸네일 갱신→프로필·설정과 Explore→사진 상세→좋아요→내 사진→위치 수정→공개 흐름을 클릭 프로토타입으로 완주 + 웹 Home/앨범 화면은 변경되지 않음. Evidence `<attemptDir>/task-1-mobile-app-local-photo-library.mp4`.
  Commit: Y | `docs(mobile): approve explore first product`

- [ ] 2. 독립 Expo 모바일 워크스페이스와 품질 게이트 구성
  What to do / Must NOT do: `mobile/`에 Expo TypeScript + Expo Router Development Build를 만들고 자체 `package-lock.json`, lint/typecheck/Jest/export/Maestro scripts, EAS preview config, `.env.example`을 둔다. 모바일 devDependency로 Supabase CLI 버전을 고정하고 `supabase/config.toml`, Docker 사전 점검, local start/reset/stop 스크립트와 Node 기반 Edge Function 통합 테스트 harness를 준비한다. 루트 웹 의존성이나 브라우저 `auth.js`를 import하지 않는다. `ios/`, `android/` 생성물은 커스텀 네이티브 모듈이 필요하다고 스파이크에서 판정되기 전에는 추적하지 않는다.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3, 4, 5, 8, 11
  References: `package.json:1-35`; `docs/spec.md:58-72`; Supabase Expo quickstart; Supabase native deep-linking docs.
  Acceptance criteria: `npm --prefix mobile ci && npm --prefix mobile exec supabase -- --version && npm --prefix mobile run supabase:check && npm --prefix mobile run lint && npm --prefix mobile run typecheck && npm --prefix mobile test -- --runInBand && npm --prefix mobile run export:all` 모두 0 종료; `supabase:check`는 Docker/CLI/config 누락을 구체적으로 보고한다.
  QA scenarios: Expo Router 기본 Home이 Development Build에서 열림 + `npm --prefix mobile run supabase:start` 후 health endpoint 200과 clean `supabase:stop` + Docker 미실행/환경변수 누락 시 비밀값 없는 설정 오류. Evidence `<attemptDir>/task-2-mobile-app-local-photo-library.png`.
  Commit: Y | `chore(mobile): scaffold expo application`

- [ ] 3. iOS/Android 기기 사진 접근 기술 스파이크 통과
  What to do / Must NOT do: 최소 지원 OS를 고정하고 full/limited/denied 권한, 10k pagination, EXIF/GPS, HEIC, Live Photo 대표 이미지, iCloud-only 원본, Android volume/generation, change listener, process resume를 실물 기기에서 검증한다. Expo 모듈로 안 되는 항목만 최소 네이티브 모듈 ADR로 제안한다.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 6, 15, 21
  References: `docs/spec.md:32-39,74-79`; Expo MediaLibrary docs; Apple PhotoKit change/limited-access docs; Android MediaStore shared-media/getGeneration docs.
  Acceptance criteria: `docs/mobile/adr/0001-native-media-boundary.md`에 플랫폼별 PASS/FAIL, 최소 OS, 선택 API, fallback이 있고 `npm --prefix mobile test -- native-capability` 통과.
  QA scenarios: 연결된 iOS/Android Development Build에서 full/limited 라이브러리 목록·GPS 표시 + 권한 거부/회수와 iCloud 네트워크 실패가 크래시 없이 상태로 표시. Evidence `<attemptDir>/task-3-mobile-app-local-photo-library.md`.
  Commit: Y | `docs(mobile): prove native media capabilities`

- [ ] 4. 통합 사진 도메인과 버전형 SQLite 스키마 구현
  What to do / Must NOT do: `source=device|cloud`, availability, visibility, asset fingerprint를 정의하고 `device_assets`, `sync_checkpoints`, `publication_jobs`, `tombstones` 테이블·FK·인덱스·트랜잭션 migration·corruption rebuild를 구현한다. 로컬 앨범 테이블은 만들지 않고 exact 좌표는 OS 백업에서 제외되는 DB에 보관하며 로그에 출력하지 않는다.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 6, 7, 10, 15, 16, 19
  References: `auth.js:21-24,283-329`; `js/photo-location-privacy.mjs:1-20`; `supabase/schema.sql:208-326`; draft decisions.
  Acceptance criteria: `npm --prefix mobile test -- local-schema --runInBand`에서 fresh install, v1→v2 migration, FK rollback, corruption rebuild, account-independent local records가 통과.
  QA scenarios: fixture DB upgrade 후 사진 좌표·동기화 상태 유지 + 손상 DB는 원본을 건드리지 않고 재인덱싱 안내 + schema에 album relation이 없음을 확인. Evidence `<attemptDir>/task-4-mobile-app-local-photo-library.txt`.
  Commit: Y | `feat(mobile-data): add local photo schema`

- [ ] 5. 공유 백엔드·개인정보·미디어 정책 계약 작성
  What to do / Must NOT do: live Supabase의 `profiles/photos/photo_private_locations/comments/user_likes`, 함수, RLS, Storage, OAuth를 읽기 전용으로 조사하고 모바일 허용 테이블을 문서화한다. 동시에 v1 정지 사진 범위, 사진 권한 UX, 임시 파생본 수명, 512MB 캐시, backup exclusion, GPS 전송, offline 정책을 고정한다. `albums`와 `album_photos`는 웹 보존 대상으로만 기록하고 모바일 repository 범위에 넣지 않으며 live 데이터를 변경하지 않는다.
  Parallelization: Wave 1 | Blocked by: 1, 2 | Blocks: 6, 8-10, 17-20
  References: `js/photo-file-validation.mjs:1-31`; `js/photo-upload-optimizer.mjs:1-117`; `docs/spec.md:32-56`; Apple App Privacy; Google Play Photo/Video Permissions and Data Safety docs.
  Acceptance criteria: `npm --prefix mobile test -- policy-contract --runInBand`와 기존 web Supabase 계약 테스트 통과; backend contract가 모바일 허용 테이블과 웹 전용 앨범 테이블을 분리하고 privacy data map이 보존기간·전송대상을 기록.
  QA scenarios: owner/non-owner/anonymous RLS 캡처 + 모바일 repository 생성 목록에 앨범이 없음을 정적 검사 + HEIC 공개 전 변환과 RAW/동영상 비지원 안내. Evidence `<attemptDir>/task-5-mobile-app-local-photo-library.md`.
  Commit: Y | `docs(mobile): define backend and privacy boundaries`

- [ ] 6. PhotoKit/MediaStore 어댑터와 썸네일 파이프라인 구현
  What to do / Must NOT do: 권한 조회/요청, cursor pagination, metadata, OS thumbnail, on-demand original, HEIC/Live Photo 대표 이미지 어댑터를 공통 interface 뒤에 구현한다. 원본을 persistent app storage로 복사하거나 모든 이미지를 한 번에 메모리에 올리지 않는다.
  Parallelization: Wave 2 | Blocked by: 3, 4, 5 | Blocks: 7, 10, 15, 16
  References: task 3 ADR; `docs/spec.md:32-39`; Expo MediaLibrary/Image docs; Apple PhotoKit; Android MediaStore.
  Acceptance criteria: `npm --prefix mobile test -- device-media --runInBand` 통과; 10k fixture가 200개 이하 page로 읽히며 thumbnail cache eviction이 512MB를 넘지 않음.
  QA scenarios: 실제 기기에서 그리드 썸네일→원본 전환 + iCloud/파일 I/O 실패 시 재시도 상태. Evidence `<attemptDir>/task-6-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-media): add device photo adapter`

- [ ] 7. 증분 재조정과 삭제·권한 회수 복구 구현
  What to do / Must NOT do: 앱 시작/foreground에서 stable fingerprint, iOS change details, Android generation/version과 제한 재스캔으로 추가·수정·삭제를 원자 반영한다. permission-limited를 deletion으로 확정하지 않고 tombstone 보존 후 재선택을 복구한다.
  Parallelization: Wave 2 | Blocked by: 4, 6 | Blocks: 15, 19
  References: task 3 ADR; `js/page-state.mjs:1-30`; Expo MediaLibrary `hasIncrementalChanges`; Apple change observer; Android `MediaStore.getGeneration`.
  Acceptance criteria: `npm --prefix mobile test -- reconciliation --runInBand`에서 insert/update/delete, 권한 회수/복원, Android volume reset, 중복 자산, 중단 후 재개가 통과.
  QA scenarios: 외부 앱에서 원본 삭제 후 3초 내 내 사진 수·핀 갱신 + 제한 권한 변경은 사진 삭제 없이 접근 제한 배너. Evidence `<attemptDir>/task-7-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-media): reconcile library changes`

- [ ] 8. 모바일 Supabase Auth와 딥링크 보안 구현
  What to do / Must NOT do: publishable key로 PKCE, 암호화된 session persistence, foreground refresh, email/Google/Kakao/Apple, password reset, custom scheme와 universal/app links, 계정 연결을 구현한다. 브라우저 `window.location` 코드나 provider secret을 재사용하지 않는다.
  Parallelization: Wave 2 | Blocked by: 2, 5 | Blocks: 9-14, 16-18, 20
  References: `auth.js:112-205`; `js/oauth-provider-options.mjs`; `js/oauth-redirect-url.mjs`; `docs/spec.md:23-30`; Supabase React Native Auth and native deep-linking docs; Apple Guideline 4.8.
  Acceptance criteria: `npm --prefix mobile test -- auth --runInBand` 통과; redirect allowlist 문서와 provider별 callback fixture가 있고 앱 재시작 후 동일 user id 세션 복원.
  QA scenarios: 신규/기존 이메일·Google·Kakao·Apple 로그인과 password reset 딥링크 + 취소/만료/다른 계정 identity 충돌. Evidence `<attemptDir>/task-8-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-auth): add secure shared authentication`

- [ ] 9. 타입 안전 클라우드 저장소 어댑터 구현
  What to do / Must NOT do: profiles/photos/private locations/likes/comments와 signed URL을 typed repository로 구현하고 existing private/link/public 사진을 읽고 관리한다. `albums`와 `album_photos` repository/query/mutation, CDN global client, 전체 행 select, signed URL 영구 저장을 금지한다.
  Parallelization: Wave 2 | Blocked by: 5, 8 | Blocks: 11-14, 16, 18, 20
  References: `auth.js:18-105,224-672`; `supabase/schema.sql:208-621`; task 1 backend contract.
  Acceptance criteria: `npm --prefix mobile test -- cloud-repository --runInBand`와 staging RLS contract suite 통과; URL 만료 후 재발급과 owner/non-owner/anonymous 결과가 일치.
  QA scenarios: 기존 개인/링크/공개 사진과 좋아요 목록 로드 + 만료 URL·오프라인·RLS 거부가 빈 화면이 아닌 복구 상태 + 앨범 API 호출 0건. Evidence `<attemptDir>/task-9-mobile-app-local-photo-library.txt`.
  Commit: Y | `feat(mobile-cloud): add typed supabase repositories`

- [ ] 10. 멱등 공개 outbox와 임시 파생본 수명주기 구현
  What to do / Must NOT do: `queued|preparing|uploading|persisting|published|failed|cancelled` job, 멱등성 키, 동시 2개, 지수 backoff, process-death resume, Storage/DB compensation, 임시 JPEG/WebP와 EXIF/GPS stripping을 구현한다. 명시적 확인 전 네트워크 업로드를 시작하지 않는다.
  Parallelization: Wave 2 | Blocked by: 4-6, 8 | Blocks: 16, 19, 20
  References: `auth.js:302-329,645-716`; `js/photo-upload-optimizer.mjs:1-117`; `js/storage-upload-options.mjs`; `test/upload-persistence-compensation.test.mjs`.
  Acceptance criteria: `npm --prefix mobile test -- publication-outbox --runInBand`에서 각 상태 전이, 재시도 중복 방지, Storage 성공/DB 실패 보상, 재시작, 취소 후 임시 파일 삭제가 통과.
  QA scenarios: 사진 3장 private/link/public 저장 성공 + 업로드 50%에서 프로세스 종료·재실행 후 중복 없이 복구. Evidence `<attemptDir>/task-10-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-publish): add durable publication outbox`

- [ ] 11. 앱 내비게이션·디자인 시스템·게스트/로그인 경계 구현
  What to do / Must NOT do: 하단 `Explore · 내 사진 · 좋아요` 탭, 각 top-level 화면 상단 오른쪽의 약 36px 원형 프로필 썸네일, photo/profile/settings detail stack, 웹 딥그린·크림 토큰, safe area, skeleton/empty/error/offline 상태를 구현하고 Explore를 기본 진입으로 둔다. 썸네일은 프로필 이미지 또는 기본 사용자 아이콘을 표시하고 로그인 상태에 따라 프로필·설정 또는 로그인 화면을 연다. 프로필 하단 탭과 앨범 route/tab/component를 만들지 않는다.
  Parallelization: Wave 3 | Blocked by: 1, 2, 8, 9 | Blocks: 12-19, 21
  References: `index.html:117-579`; `style.css`; `js/app-sections.mjs:1-35`; `docs/spec.md:15-21`.
  Acceptance criteria: `npm --prefix mobile test -- navigation --runInBand` 통과; 하단 탭은 정확히 3개이고 프로필 tab route는 없으며 모든 핵심 화면이 320px 폭, 큰 글자, light/dark OS 설정에서 overflow 없음.
  QA scenarios: 앱 실행→Explore 기본 진입→상단 프로필 썸네일→프로필·설정→복귀와 게스트 기본 아이콘→로그인→원래 화면 복귀 + 하단 Explore/내 사진/좋아요 전환 + 전 route 목록에 album 문자열 0건. Evidence `<attemptDir>/task-11-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-ui): add navigation and app shell`

- [ ] 12. Explore 공개 지도·목록·사진 상세 구현
  What to do / Must NOT do: 앱의 첫 화면으로 공개 사진 지도, 현재 bounds 목록, mine/others 범위, marker cluster, 검색, 사진 상세 바텀시트와 지도 준비 후 핀 표시를 구현한다. 첫 사진을 자동 선택하거나 private/link/hidden 좌표를 노출하지 않는다.
  Parallelization: Wave 3 | Blocked by: 8, 9, 11 | Blocks: 13, 18-21
  References: `index.html:379-579,600-643`; `js/explore-discovery-panel.mjs`; `js/explore-marker-clusters.mjs`; `docs/spec.md:41-48`.
  Acceptance criteria: `npm --prefix mobile test -- explore-map --runInBand` 통과; 5k pin fixture clustering/bounds query 500ms 이내이고 초기 selected photo는 null.
  QA scenarios: fresh launch→지도 준비→핀 표시→지도 이동→현재 영역 갱신→핀/목록 사진 상세 + 지도 오류 시 재시도 가능한 목록 상태. Evidence `<attemptDir>/task-12-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-explore): add primary discovery map`

- [ ] 13. Explore 소셜·공개 프로필·사진 공유 구현
  What to do / Must NOT do: 좋아요 원자 RPC, 댓글 작성·삭제, 작성자 프로필의 공개 사진 그리드·지도, 링크·native share·Kakao photo share를 구현한다. 공개 앨범, 앨범 탭, 앨범 공유를 넣거나 차단 사용자를 노출하지 않는다.
  Parallelization: Wave 3 | Blocked by: 8, 9, 11, 12 | Blocks: 14, 18-21
  References: `auth.js:382-487`; `js/share-link.mjs`; `js/kakao-share.mjs`; `docs/spec.md:41-48`.
  Acceptance criteria: `npm --prefix mobile test -- social profile share --runInBand`와 staging `set_photo_like` concurrency test 통과; profile navigation에 photo/map만 존재.
  QA scenarios: anonymous 사진 상세→로그인→좋아요/댓글→프로필→사진 공유 + hidden location, 차단 사용자, signed URL 만료, 댓글 권한 실패. Evidence `<attemptDir>/task-13-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-social): add explore interactions`

- [ ] 14. 좋아요한 사진 화면 구현
  What to do / Must NOT do: 현재 사용자의 `user_likes`를 페이지네이션해 공개 사진 그리드로 표시하고 사진 상세·좋아요 해제로 연결한다. 비공개 전환·삭제·차단된 사진은 RLS 결과에 따라 안전하게 제거하고 앨범 grouping이나 웹에 없는 소셜 알림을 만들지 않는다.
  Parallelization: Wave 3 | Blocked by: 8, 9, 11, 13 | Blocks: 19-21
  References: `auth.js:450-487`; `index.html:285-330`; task 9 cloud repository; task 13 photo detail routes.
  Acceptance criteria: `npm --prefix mobile test -- liked-photos --runInBand` 통과; pagination, unlike, private/delete/block, signed URL 만료가 정확히 처리됨.
  QA scenarios: Explore 사진 좋아요→좋아요 탭에 표시→상세 이동→좋아요 해제 후 제거 + 비공개/삭제/차단 사진은 정보 노출 없이 정리. Evidence `<attemptDir>/task-14-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-likes): add liked photo collection`

- [ ] 15. 보조 내 사진 보관함·상세·원본 보기 구현
  What to do / Must NOT do: 내 사진 탭에 최근 사진, 날짜 그룹, 선택, 썸네일, 상세 메타데이터, 원본 전체화면, missing/limited 상태, 기기 삭제 OS 확인을 구현한다. 사진 정리를 주 내비게이션보다 강조하거나 앨범 grouping/CRUD를 넣지 않는다.
  Parallelization: Wave 3 | Blocked by: 3, 4, 6, 7, 11 | Blocks: 16, 19-21
  References: `index.html:152-330,600-653`; `js/personal-photo-selection.mjs`; `js/photo-exif-reader.mjs`; `docs/spec.md:32-39`.
  Acceptance criteria: `npm --prefix mobile test -- local-library --runInBand` 통과; 10k fixture에서 virtualized grid가 한 번에 100개 이하 cell을 mount하고 album grouping API가 없음.
  QA scenarios: 내 사진 탭→썸네일→원본→복귀와 다중 선택 + 외부 삭제/권한 회수/OS 삭제 취소가 정확한 상태 유지. Evidence `<attemptDir>/task-15-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-library): add secondary device photos`

- [ ] 16. 내 사진 지도·위치 보정·클라우드 사진 관리 구현
  What to do / Must NOT do: GPS 있는 기기 사진 지도, missing-location queue, exact 좌표 편집, 선택한 사진의 private/link/public 저장, 기존 cloud photo의 설명·날짜·위치 정밀도·공개범위 수정과 cloud delete를 구현한다. 기기 삭제와 cloud delete를 혼용하거나 앨범 API를 호출하지 않는다.
  Parallelization: Wave 3 | Blocked by: 4, 6, 8-11, 15 | Blocks: 19-21
  References: `auth.js:331-448,645-716`; `index.html:233-284,654-703`; `js/location-workflow.mjs`; `js/visibility-label.mjs`; `js/photo-location-privacy.mjs`.
  Acceptance criteria: `npm --prefix mobile test -- local-map cloud-management --runInBand`와 staging delete cascade assertions 통과; 내 사진 지도의 5k pin clustering/bounds query 500ms 이내.
  QA scenarios: 내 사진 날짜/지도에서 동일 사진 선택→위치 보정→명시적 공개→Explore 확인 + cloud photo 비공개 전환/삭제 + 로컬 원본 삭제 후 cloud 사본 유지. Evidence `<attemptDir>/task-16-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-photos): add map and cloud management`

- [ ] 17. 앱 내 계정 삭제와 데이터 보존 처리 구현
  What to do / Must NOT do: `supabase/functions/delete-account/index.ts`가 다음 계약을 제공한다. `GET /functions/v1/delete-account`는 기존 웹 번들과 분리된 store-policy HTML 폼, `POST /functions/v1/delete-account/otp`는 `{email}`을 받아 IP+email hash별 시간당 5회 제한 후 Supabase OTP를 발송하고 계정 존재 여부와 무관하게 항상 202, `POST /functions/v1/delete-account/jobs`는 5분 이내 OTP/재인증 JWT·`Idempotency-Key`·`{"confirmation":"DELETE"}`를 받아 202와 `{job_id,status,status_token}`, `GET /functions/v1/delete-account/jobs/{job_id}`는 24시간 opaque `status_token`으로 `queued|running|completed|failed`와 재시도 가능 여부를 반환한다. token hash와 rate limit만 DB에 보관하고 service-role secret은 Function secret에만 두며 기기 원본은 삭제하지 않는다.
  Parallelization: Wave 4 | Blocked by: 5, 8, 11 | Blocks: 20, 21
  References: `supabase/schema.sql:434-490`; `docs/spec.md:50-56`; Apple account deletion guideline; Google Play account deletion requirements.
  Acceptance criteria: `npm --prefix mobile run supabase:start && npm --prefix mobile exec supabase -- db reset && npm --prefix mobile test -- delete-account-edge account-deletion --runInBand && npm --prefix mobile run supabase:stop`이 0 종료; fixture는 existing/non-existing email 동일 202, recent/stale JWT, OTP, IP+email rate limit, invalid/expired status token, duplicate idempotency, Storage partial failure를 포함한다. 중복 요청은 같은 cleanup job을 재개하고 삭제 후 cloud object 0, auth 접근 불가, 기기 원본 유지, protected browser-app path diff 0.
  QA scenarios: 재인증 후 삭제 완료 + 취소/최근 로그인 아님/Storage 일부 실패에서 동일 job 재시도 + 독립 request endpoint가 기존 웹 번들을 로드하거나 수정하지 않음. Evidence `<attemptDir>/task-17-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(account): add compliant account deletion`

- [ ] 18. UGC 신고·차단·운영자 처리 경로 구현
  What to do / Must NOT do: reports/blocks/moderation_actions migration과 RLS, 사진·댓글·프로필 신고, 사용자 차단을 구현한다. 차단 필터는 기존 웹 query/RLS를 바꾸지 않는 모바일 전용 `get_mobile_explore_photos` RPC에만 적용한다. 운영 조치는 `supabase/functions/moderate-content/index.ts`가 `app_metadata.role=moderator` JWT만 받아 allowlisted `hide|restore|dismiss`를 수행하고 immutable `moderation_actions`에 auth user id/time/reason을 기록한다. role 부여는 Supabase Dashboard의 Auth 관리자만 가능하고 운영자는 curl/Postman runbook을 사용하며 모바일·기존 웹에는 운영자 UI·service key를 넣지 않는다.
  Parallelization: Wave 4 | Blocked by: 5, 8, 9, 11-13 | Blocks: 20, 21
  References: `auth.js:450-487`; `docs/spec.md:41-56`; Apple App Review Guideline 1.2; Google Play UGC policy.
  Acceptance criteria: `npm --prefix mobile run supabase:start && npm --prefix mobile exec supabase -- db reset && npm --prefix mobile test -- moderation-edge moderation --runInBand && npm --prefix mobile run supabase:stop`이 0 종료; fixture는 user/moderator/admin claim, action allowlist, duplicate report, RPC block filtering을 포함한다. 모바일 차단 관계가 Explore, 검색, 댓글, 프로필에서 일관되고 기존 웹 query snapshot은 불변이며 운영 조치마다 UPDATE/DELETE 불가 audit row가 남음.
  QA scenarios: 사진/댓글 신고와 사용자 차단 즉시 반영 + 제한 운영 역할의 hide/restore 조치와 감사 로그 + 중복 신고/자기 자신 차단/권한 없는 moderation 거부. Evidence `<attemptDir>/task-18-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(safety): add reporting and blocking`

- [ ] 19. 오프라인·성능·접근성·캐시 예산 충족
  What to do / Must NOT do: offline read/local write, cloud action queue 안내, pagination, image prefetch/cancel, cache eviction, reduced motion, screen reader, dynamic type를 다듬고 성능 fixture/측정 스크립트를 추가한다. offline 좋아요/댓글을 성공처럼 표시하지 않는다.
  Parallelization: Wave 4 | Blocked by: 4, 5, 7, 10-16 | Blocks: 21
  References: `docs/spec.md:58-64`; `test/performance-budget.test.mjs`; task 5 policy; verification budgets above.
  Acceptance criteria: `npm --prefix mobile run perf:test && npm --prefix mobile run a11y:test`가 모든 예산을 통과하고 측정 JSON을 생성.
  QA scenarios: 5k 공개 핀 지도 이동과 10k 내 사진 스크롤/foreground sync + 비행기 모드에서 cached Explore와 내 사진은 유지되고 cloud action은 명시적 대기/실패. Evidence `<attemptDir>/task-19-mobile-app-local-photo-library.json`.
  Commit: Y | `perf(mobile): enforce offline and performance budgets`

- [ ] 20. 웹·앱 교차 클라이언트 migration과 회귀 검증
  What to do / Must NOT do: 모든 신규 migration을 backward-compatible하게 적용하고 mobile-created private/link/public 사진, likes/comments와 account deletion이 기존 웹에서 맞게 보이는지 검증한다. 모바일 전용 block RPC는 기존 웹에서 호출하지 않으며 모바일 diff가 웹의 코드·라우트·테이블 결과·앨범 행을 변경하지 않았음을 별도 검사한다. 기존 웹을 깨는 rename/drop은 금지한다.
  Parallelization: Wave 4 | Blocked by: 5, 8-10, 12-18 | Blocks: 21
  References: `docs/spec.md:66-72`; `package.json:6-22`; `supabase/migrations`; `test/*supabase*`; `test/*explore*`; task 1 contract.
  Acceptance criteria: staging migration rehearsal 후 `npm test && npm run build && npm run perf:budget && npm --prefix mobile test -- cross-client --runInBand` 모두 통과; `git diff --exit-code "$(cat docs/mobile/web-baseline.txt)" -- index.html style.css auth.js js images functions`로 protected browser-app path diff 0을 증명하고 rollback/runbook 작성.
  QA scenarios: 앱에서 공개한 사진을 웹 Explore/profile/share에서 확인 + 웹에서 기존 앨범 생성·상세·편집·공유 회귀 시나리오 통과 + 이전 웹 번들로 새 nullable 필드/blocked rows 처리. Evidence `<attemptDir>/task-20-mobile-app-local-photo-library.md`.
  Commit: Y | `test(integration): verify web mobile compatibility`

- [ ] 21. 실제 기기 E2E와 스토어 출시 후보 완성
  What to do / Must NOT do: iOS/Android preview build, Maestro 전체 흐름, fresh OAuth, 권한 matrix, 외부 삭제, process death, iCloud, signed URL expiry, account switch, account deletion, moderation, 개인정보 문서, screenshots, age rating, reviewer account를 준비한다. 권한 선언 승인 없이 production 제출하지 않는다.
  Parallelization: Wave 4 | Blocked by: 1, 3, 11-20 | Blocks: Final verification
  References: `docs/spec.md:74-79`; `docs/audits/full-service-audit-2026-08-10.md`; `eas.json` (planned); Apple/Google release policies.
  Acceptance criteria: `npm --prefix mobile run release:check`와 iOS/Android `maestro test mobile/e2e` 통과; TestFlight/Play internal build install 성공; privacy manifest/Data Safety 체크리스트 누락 0.
  QA scenarios: 새 계정으로 Explore→사진 상세→좋아요/댓글/공유→좋아요 목록→내 사진→지도·위치 수정→명시적 공개→웹 확인→신고/차단→계정 삭제 전체 흐름 + 앱에서 앨범 표면 0개 + 권한 거부/네트워크 단절/앱 강제 종료 failure matrix. Evidence `<attemptDir>/task-21-mobile-app-local-photo-library.md`.
  Commit: Y | `chore(mobile): prepare store release candidate`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit: 모든 Must have, guardrail, 21개 acceptance와 evidence를 대조하고 누락 0을 증명.
- [ ] F2. Code quality review: mobile/backend/docs diff의 타입, 보안, RLS, 개인정보, migration, 테스트 품질을 독립 검토하고 protected browser-app path diff 0, P0/P1 0을 증명.
- [ ] F3. Real manual QA: 연결된 iOS/Android 실제 기기와 배포된 web preview에서 task 21 happy/failure matrix 재실행.
- [ ] F4. Scope fidelity: Explore 기본 진입, 하단 탭 3개, 프로필 하단 탭 0개, 상단 프로필 썸네일 진입, 내 사진 보조 구조, 모바일 앨범 route/component/repository/query 0개, 모든 protected browser-app path diff 0개, 웹 앨범 행/동작 변화 0개, 원본 자동 업로드·비밀 키 번들 0개를 정적/런타임 감사.

## Commit strategy
- 각 todo는 테스트와 구현을 한 원자 커밋으로 묶고 위 Commit 문구를 기본으로 사용한다.
- Supabase migration은 additive/backward-compatible 커밋으로 먼저 적용하고, web/mobile 소비 코드는 뒤 커밋에서 활성화한다.
- `dev`에 preview와 내부 배포 검증을 완료한 뒤에만 사용자의 명시적 승인으로 `main`/production을 갱신한다.
- 생성된 빌드, 서명 파일, 실제 `.env`, 네이티브 비밀값, 개인 사진 fixture는 커밋하지 않는다.

## Success criteria
- iOS/Android 앱이 Explore로 시작하고 공개 지도·목록·사진 상세·좋아요·댓글·공유·프로필이 주 흐름으로 동작한다.
- 기기 사진 원본을 서버에 자동 저장하지 않고 보조 내 사진 탭의 그리드·원본·지도·위치 수정으로 사용할 수 있다.
- 앱 재실행, 권한 변경, 외부 삭제, iCloud 지연, Android 볼륨 변경에도 내 사진 수와 핀이 손상 없이 재조정된다.
- 명시적 cloud action만 private/link/public 사본을 만들고, 중단·재시도에도 중복 DB/Storage object와 임시 파일이 남지 않는다.
- 기존 웹 계정과 cloud 사진·프로필·좋아요·댓글·공유가 앱과 동일 RLS 아래 상호 운용된다.
- 모바일에는 앨범 UI·route·repository·query가 없고, 기존 웹의 앨범 기능과 데이터는 변경 없이 회귀 테스트를 통과한다.
- 이메일/Google/Kakao/Apple 로그인, 복구, 계정 삭제, 신고·차단이 스토어 정책과 실제 기기 QA를 통과한다.
- mobile lint/typecheck/unit/component/export/Maestro, backend RLS/migration, 기존 web test/build/performance gate가 모두 통과한다.
- 서버에 저장되지 않은 로컬 사진은 웹/다른 기기/계정에서 보이지 않는다는 경계가 UI와 개인정보 문서에 명확하다.
