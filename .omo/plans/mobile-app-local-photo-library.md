# mobile-app-local-photo-library - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** 웹의 계정, 프로필, 사진 관리, 여행 앨범, 지도 탐색, 좋아요, 댓글, 공유 기능을 iPhone과 Android 앱에서 사용할 수 있습니다. 휴대폰 사진 원본은 기기 앨범에 그대로 두고, 사용자가 클라우드 저장이나 공개를 직접 선택한 사진만 서버 사본을 만듭니다.

**Why this approach:** 기기 사진과 공개 사진을 분리하면 서버 저장비를 줄이면서 개인정보 경계를 명확히 할 수 있습니다. 앱 내부 가상 앨범을 사용하면 iOS와 Android의 서로 다른 앨범 권한에도 같은 경험을 제공할 수 있습니다.

**What it will NOT do:** 휴대폰 전체 사진을 몰래 서버에 올리지 않습니다. 로컬 사진이 웹이나 다른 기기에서 자동으로 보이거나 복구된다고 약속하지 않습니다. 앱에서 만든 앨범이 휴대폰 기본 사진 앱의 시스템 앨범을 직접 바꾸지도 않습니다.

**Effort:** XL
**Risk:** High - 사진 권한과 변경 감지가 iOS·Android에서 다르고, 공개 업로드·OAuth·스토어 심사를 함께 맞춰야 합니다.
**Decisions to sanity-check:** 앱 내부 가상 앨범, 로컬 앨범 정보의 기기 전용 저장, React Native + Expo Development Build, iOS/Android 동시 지원, 정지 사진 중심의 첫 출시 범위입니다.

Your next move: 계획대로 개발을 시작하거나, 구현 전에 이 계획을 고정밀 이중 검토합니다. Full execution detail follows below.

---

> TL;DR (machine): XL/high-risk 21-task iOS+Android Expo plan with device-only media, SQLite virtual albums, shared Supabase cloud parity, explicit publication outbox, compliance, and real-device release gates.

## Scope
### Must have
- `mobile/` 독립 Expo Development Build 앱: TypeScript, Expo Router, Expo SQLite, Expo MediaLibrary, Expo Image, React Native Maps, Supabase JS.
- 웹과 같은 Supabase 프로젝트·사용자·RLS를 공유하는 이메일/Google/Kakao/Apple 인증, 비밀번호 복구, 프로필.
- 로그인 없이도 쓰는 기기 단위 사진 보관함: 원본은 PhotoKit/MediaStore에만 두고 SQLite에는 자산 ID·시간·좌표·가상 앨범 관계·동기화 상태만 저장.
- 전체/제한/거부/회수 권한, 외부 삭제, iCloud 원본 지연, Android 볼륨 변화에 안전한 인덱싱·재조정.
- 로컬 사진 그리드·상세·지도·위치 보정·가상 여행 앨범과 기존 클라우드 사진·앨범 관리.
- 사용자가 명시적으로 선택할 때만 `private|link|public` 클라우드 사본 생성. 공개 파생본, outbox, 멱등성, 재시도, 고아 파일 정리 포함.
- Explore, 좋아요, 댓글, 공개 프로필, 링크/카카오 공유와 계정 삭제, 신고·차단·운영 대응.
- iOS/Android 실제 기기, 웹 회귀, RLS, 성능·접근성·스토어 정책까지 통과하는 출시 절차.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- 기기 사진 원본·전체 라이브러리의 자동 서버 업로드 또는 durable app-storage 복제.
- 로컬 앨범 편집을 공개 앨범에 자동 반영하거나, 기기 원본 삭제로 이미 생성된 클라우드 사본을 삭제하는 동작.
- 기기 전용 사진이 웹·다른 기기에서 보이거나 복구된다는 약속.
- 앱 종료 중 모든 플랫폼에서 실시간 변경 감지를 보장하는 기능.
- RAW·동영상 전체 지원, OS 시스템 앨범 직접 관리, 로컬 앨범의 기기 간 동기화.
- 서비스 역할 키, OAuth 비밀 키, 웹용 Google Maps 키를 앱 번들에 포함.

## Verification strategy
> 자동 검증은 에이전트가 실행한다. 실물 기기 권한 승인, 개발자 계정·서명 자격 증명 제공, Play 권한 선언 제출, 최종 스토어 제출은 아래 Owner gate로 분리한다.
- Test decision: 동기화·로컬 DB·outbox·권한 상태는 TDD(Jest), 화면은 tests-after(React Native Testing Library), 사용자 흐름은 Maestro와 실제 기기 QA.
- Standard gate: `npm --prefix mobile run lint && npm --prefix mobile run typecheck && npm --prefix mobile test -- --runInBand && npm --prefix mobile run export:all && npm test && npm run build && npm run perf:budget`.
- Native gate: iOS/Android Development Build에서 `maestro test mobile/e2e`; full/limited/denied/revoked 권한, 외부 삭제, 프로세스 종료 중 업로드, 오프라인, 계정 전환을 각각 실행.
- Backend gate: Supabase 로컬/스테이징에서 migration 적용 후 owner/non-owner/anonymous RLS와 Storage 고아 정리 테스트.
- Performance budgets: 10,000장 fixture 최초 인덱싱 60초 이내, warm launch 2.5초 이내, foreground 증분 반영 3초 이내, 그리드 스크롤 중 메모리 350MB 이내, 썸네일 캐시 기본 512MB 상한. 실제 중급 기기에서 측정하고 미달 시 출시 차단.
- Owner gates: Apple/Google/Kakao 앱 등록·콜백, iOS/Android 서명, 실물 기기 1대씩, 개인정보/지원 URL, Play broad-photo-access 선언, TestFlight/Play Console 최종 제출 승인.
- Evidence: <attemptDir>/task-<N>-mobile-app-local-photo-library.<ext> (attemptDir = currentAttemptDir from 'omo ulw-loop status --json', .omo/evidence/ulw/<session>/<goalId>/a<attempt>; outside ulw-loop use .omo/evidence/)

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- Wave 1, feasibility and contracts: 1-5. UI 개발 전에 실제 기기 접근성과 데이터·정책 경계를 확정한다.
- Wave 2, data engines: 6-10. 기기 미디어, 재조정, 모바일 Auth, 클라우드 저장소, 공개 outbox를 병렬 구축한다.
- Wave 3, product parity: 11-16. 공통 셸 위에 로컬 보관함·지도·앨범과 클라우드 관리·Explore를 완성한다.
- Wave 4, launch hardening: 17-21. 계정 삭제·UGC 안전·성능·교차 클라이언트·스토어 출시를 닫는다.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | - | 8, 9, 10, 15, 17, 18, 20 | 2, 3, 4, 5 |
| 2 | - | 6-21 | 1, 3, 4, 5 |
| 3 | 2 | 6, 7, 12-14, 21 | 1, 4, 5 |
| 4 | 2 | 6, 7, 10, 12-15, 19 | 1, 3, 5 |
| 5 | 1, 2 | 6, 8, 10, 17-19, 21 | 3, 4 |
| 6 | 3, 4, 5 | 7, 10, 12-15, 19 | 8, 9 |
| 7 | 4, 6 | 12-14, 19, 21 | 8-10 |
| 8 | 1, 2, 5 | 9-11, 15-18, 20 | 6, 7 |
| 9 | 1, 2, 8 | 11, 15, 16, 20 | 6, 7, 10 |
| 10 | 1, 4, 6, 8 | 14, 15, 19-21 | 7, 9 |
| 11 | 2, 8, 9 | 12-18, 21 | - |
| 12 | 3, 4, 6, 7, 11 | 13, 14, 19, 21 | 15, 16 |
| 13 | 6, 7, 11, 12 | 14, 19, 21 | 15, 16 |
| 14 | 4, 6, 7, 10-13 | 19-21 | 15, 16 |
| 15 | 8-12 | 19-21 | 13, 14, 16 |
| 16 | 8, 9, 11 | 18-21 | 12-15 |
| 17 | 1, 5, 8, 11 | 20, 21 | 18, 19 |
| 18 | 1, 5, 8, 9, 11, 16 | 20, 21 | 17, 19 |
| 19 | 4, 5, 7, 10, 12-16 | 21 | 17, 18, 20 |
| 20 | 1, 8-10, 14-18 | 21 | 19 |
| 21 | 3, 11-20 | Final verification | - |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Live Supabase 계약과 웹 기능 기준선 고정
  What to do / Must NOT do: 읽기 전용으로 live 테이블·함수·RLS·Storage private 상태·OAuth 공급자·행 수를 조사하고 `docs/mobile/backend-contract.md`와 schema snapshot을 만든다. 문서의 오래된 public-bucket 설명을 신뢰하거나 live 데이터를 변경하지 않는다.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 8, 9, 10, 15, 17, 18, 20
  References: `auth.js:18-105,224-716`; `supabase/schema.sql:208-621`; `docs/integrations.md:24-56`; `docs/spec.md:50-56,66-72`
  Acceptance criteria: `npm test -- --test-name-pattern="supabase|storage|like|profile"` 통과; snapshot에는 `profiles/photos/photo_private_locations/albums/album_photos/comments/user_likes`, `set_photo_like`, bucket privacy와 signed URL TTL이 모두 기록됨.
  QA scenarios: Supabase MCP read-only inventory로 정상 계약 캡처 + 존재하지 않는/권한 없는 행이 RLS에서 거부됨을 SQL assertion으로 확인. Evidence `<attemptDir>/task-1-mobile-app-local-photo-library.md`.
  Commit: Y | `docs(mobile): record shared backend contract`

- [ ] 2. 독립 Expo 모바일 워크스페이스와 품질 게이트 구성
  What to do / Must NOT do: `mobile/`에 Expo TypeScript + Expo Router Development Build를 만들고 자체 `package-lock.json`, lint/typecheck/Jest/export/Maestro scripts, EAS preview config, `.env.example`을 둔다. 루트 웹 의존성이나 브라우저 `auth.js`를 import하지 않는다. `ios/`, `android/` 생성물은 커스텀 네이티브 모듈이 필요하다고 스파이크에서 판정되기 전에는 추적하지 않는다.
  Parallelization: Wave 1 | Blocked by: - | Blocks: 6-21
  References: `package.json:1-35`; `docs/spec.md:58-72`; Supabase Expo quickstart; Supabase native deep-linking docs.
  Acceptance criteria: `npm --prefix mobile ci && npm --prefix mobile run lint && npm --prefix mobile run typecheck && npm --prefix mobile test -- --runInBand && npm --prefix mobile run export:all` 모두 0 종료.
  QA scenarios: Expo Router 기본 Home이 Development Build에서 열림 + 필수 공개 환경변수 누락 시 비밀값을 출력하지 않는 설정 오류 화면. Evidence `<attemptDir>/task-2-mobile-app-local-photo-library.png`.
  Commit: Y | `chore(mobile): scaffold expo application`

- [ ] 3. iOS/Android 기기 사진 접근 기술 스파이크 통과
  What to do / Must NOT do: 최소 지원 OS를 고정하고 full/limited/denied 권한, 10k pagination, EXIF/GPS, HEIC, Live Photo 대표 이미지, iCloud-only 원본, Android volume/generation, change listener, process resume를 실물 기기에서 검증한다. Expo 모듈로 안 되는 항목만 최소 네이티브 모듈 ADR로 제안한다.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 6, 7, 12-14, 21
  References: `docs/spec.md:32-39,74-79`; Expo MediaLibrary docs; Apple PhotoKit change/limited-access docs; Android MediaStore shared-media/getGeneration docs.
  Acceptance criteria: `docs/mobile/adr/0001-native-media-boundary.md`에 플랫폼별 PASS/FAIL, 최소 OS, 선택 API, fallback이 있고 `npm --prefix mobile test -- native-capability` 통과.
  QA scenarios: 연결된 iOS/Android Development Build에서 full/limited 라이브러리 목록·GPS 표시 + 권한 거부/회수와 iCloud 네트워크 실패가 크래시 없이 상태로 표시. Evidence `<attemptDir>/task-3-mobile-app-local-photo-library.md`.
  Commit: Y | `docs(mobile): prove native media capabilities`

- [ ] 4. 통합 사진 도메인과 버전형 SQLite 스키마 구현
  What to do / Must NOT do: `source=device|cloud`, availability, visibility, asset fingerprint를 정의하고 `device_assets`, `local_albums`, `local_album_assets`, `sync_checkpoints`, `publication_jobs`, `tombstones` 테이블·FK·인덱스·트랜잭션 migration·corruption rebuild를 구현한다. exact 좌표는 OS 백업에서 제외되는 DB에 보관하고 로그에 출력하지 않는다.
  Parallelization: Wave 1 | Blocked by: 2 | Blocks: 6, 7, 10, 12-15, 19
  References: `auth.js:21-24,283-329`; `js/photo-location-privacy.mjs:1-20`; `supabase/schema.sql:208-326`; draft decisions.
  Acceptance criteria: `npm --prefix mobile test -- local-schema --runInBand`에서 fresh install, v1→v2 migration, FK rollback, corruption rebuild, account-independent local records가 통과.
  QA scenarios: fixture DB upgrade 후 앨범 순서/좌표 유지 + 손상 DB는 원본을 건드리지 않고 재인덱싱 안내. Evidence `<attemptDir>/task-4-mobile-app-local-photo-library.txt`.
  Commit: Y | `feat(mobile-data): add local photo schema`

- [ ] 5. 개인정보·권한·미디어·저장공간 정책 계약 작성
  What to do / Must NOT do: v1 정지 사진 범위(JPEG/PNG/WebP/HEIC, Live Photo 대표 이미지), RAW/동영상 제외, 광범위/선택 접근 UX, Android Play 선언, 임시 파생본 수명, 512MB 썸네일 캐시, backup exclusion, GPS/지도 전송, offline 정책을 코드 상수와 문서로 고정한다. 런타임 위치 권한은 요청하지 않는다.
  Parallelization: Wave 1 | Blocked by: 1, 2 | Blocks: 6, 8, 10, 17-19, 21
  References: `js/photo-file-validation.mjs:1-31`; `js/photo-upload-optimizer.mjs:1-117`; `docs/spec.md:32-56`; Apple App Privacy; Google Play Photo/Video Permissions and Data Safety docs.
  Acceptance criteria: `npm --prefix mobile test -- policy-contract --runInBand` 통과; `docs/mobile/privacy-data-map.md`가 device-only/cache/temporary/cloud 데이터를 각각 보존기간·전송대상과 함께 분리.
  QA scenarios: 지원 HEIC가 local-only로 표시되고 공개 전 변환 안내 + RAW/동영상은 원본을 변경하지 않고 비지원 사유 표시. Evidence `<attemptDir>/task-5-mobile-app-local-photo-library.md`.
  Commit: Y | `docs(mobile): define privacy and media policy`

- [ ] 6. PhotoKit/MediaStore 어댑터와 썸네일 파이프라인 구현
  What to do / Must NOT do: 권한 조회/요청, cursor pagination, metadata, OS thumbnail, on-demand original, HEIC/Live Photo 대표 이미지 어댑터를 공통 interface 뒤에 구현한다. 원본을 persistent app storage로 복사하거나 모든 이미지를 한 번에 메모리에 올리지 않는다.
  Parallelization: Wave 2 | Blocked by: 3, 4, 5 | Blocks: 7, 10, 12-15, 19
  References: task 3 ADR; `docs/spec.md:32-39`; Expo MediaLibrary/Image docs; Apple PhotoKit; Android MediaStore.
  Acceptance criteria: `npm --prefix mobile test -- device-media --runInBand` 통과; 10k fixture가 200개 이하 page로 읽히며 thumbnail cache eviction이 512MB를 넘지 않음.
  QA scenarios: 실제 기기에서 그리드 썸네일→원본 전환 + iCloud/파일 I/O 실패 시 재시도 상태. Evidence `<attemptDir>/task-6-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-media): add device photo adapter`

- [ ] 7. 증분 재조정과 삭제·권한 회수 복구 구현
  What to do / Must NOT do: 앱 시작/foreground에서 stable fingerprint, iOS change details, Android generation/version과 제한 재스캔으로 추가·수정·삭제를 원자 반영한다. permission-limited를 deletion으로 확정하지 않고 tombstone 보존 후 재선택을 복구한다.
  Parallelization: Wave 2 | Blocked by: 4, 6 | Blocks: 12-14, 19, 21
  References: task 3 ADR; `js/page-state.mjs:1-30`; Expo MediaLibrary `hasIncrementalChanges`; Apple change observer; Android `MediaStore.getGeneration`.
  Acceptance criteria: `npm --prefix mobile test -- reconciliation --runInBand`에서 insert/update/delete, 권한 회수/복원, Android volume reset, 중복 자산, 중단 후 재개가 통과.
  QA scenarios: 외부 앱에서 원본 삭제 후 3초 내 핀/앨범 수 갱신 + 제한 권한 변경은 사진 삭제 없이 접근 제한 배너. Evidence `<attemptDir>/task-7-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-media): reconcile library changes`

- [ ] 8. 모바일 Supabase Auth와 딥링크 보안 구현
  What to do / Must NOT do: publishable key로 PKCE, 암호화된 session persistence, foreground refresh, email/Google/Kakao/Apple, password reset, custom scheme와 universal/app links, 계정 연결을 구현한다. 브라우저 `window.location` 코드나 provider secret을 재사용하지 않는다.
  Parallelization: Wave 2 | Blocked by: 1, 2, 5 | Blocks: 9-11, 15-18, 20
  References: `auth.js:112-205`; `js/oauth-provider-options.mjs`; `js/oauth-redirect-url.mjs`; `docs/spec.md:23-30`; Supabase React Native Auth and native deep-linking docs; Apple Guideline 4.8.
  Acceptance criteria: `npm --prefix mobile test -- auth --runInBand` 통과; redirect allowlist 문서와 provider별 callback fixture가 있고 앱 재시작 후 동일 user id 세션 복원.
  QA scenarios: 신규/기존 이메일·Google·Kakao·Apple 로그인과 password reset 딥링크 + 취소/만료/다른 계정 identity 충돌. Evidence `<attemptDir>/task-8-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-auth): add secure shared authentication`

- [ ] 9. 타입 안전 클라우드 저장소 어댑터 구현
  What to do / Must NOT do: profiles/photos/private locations/albums/album_photos/likes/comments와 signed URL을 typed repository로 구현하고 existing private/link/public 자료를 읽고 관리한다. CDN global client나 전체 행 select, signed URL 영구 저장을 금지한다.
  Parallelization: Wave 2 | Blocked by: 1, 2, 8 | Blocks: 11, 15, 16, 20
  References: `auth.js:18-105,224-672`; `supabase/schema.sql:208-621`; task 1 backend contract.
  Acceptance criteria: `npm --prefix mobile test -- cloud-repository --runInBand`와 staging RLS contract suite 통과; URL 만료 후 재발급과 owner/non-owner/anonymous 결과가 일치.
  QA scenarios: 기존 개인/링크/공개 사진·앨범 로드 + 만료 URL·오프라인·RLS 거부가 빈 화면이 아닌 복구 상태. Evidence `<attemptDir>/task-9-mobile-app-local-photo-library.txt`.
  Commit: Y | `feat(mobile-cloud): add typed supabase repositories`

- [ ] 10. 멱등 공개 outbox와 임시 파생본 수명주기 구현
  What to do / Must NOT do: `queued|preparing|uploading|persisting|published|failed|cancelled` job, 멱등성 키, 동시 2개, 지수 backoff, process-death resume, Storage/DB compensation, 임시 JPEG/WebP와 EXIF/GPS stripping을 구현한다. 명시적 확인 전 네트워크 업로드를 시작하지 않는다.
  Parallelization: Wave 2 | Blocked by: 1, 4, 6, 8 | Blocks: 14, 15, 19-21
  References: `auth.js:302-329,645-716`; `js/photo-upload-optimizer.mjs:1-117`; `js/storage-upload-options.mjs`; `test/upload-persistence-compensation.test.mjs`.
  Acceptance criteria: `npm --prefix mobile test -- publication-outbox --runInBand`에서 각 상태 전이, 재시도 중복 방지, Storage 성공/DB 실패 보상, 재시작, 취소 후 임시 파일 삭제가 통과.
  QA scenarios: 사진 3장 private/link/public 저장 성공 + 업로드 50%에서 프로세스 종료·재실행 후 중복 없이 복구. Evidence `<attemptDir>/task-10-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-publish): add durable publication outbox`

- [ ] 11. 앱 내비게이션·디자인 시스템·게스트/로그인 경계 구현
  What to do / Must NOT do: Home/Library/Explore/Profile 탭과 album/photo detail stack, 웹 딥그린·크림 토큰, safe area, skeleton/empty/error/offline 상태를 구현한다. 로컬 Library는 비로그인 사용 가능하고 cloud action만 인증을 요구한다.
  Parallelization: Wave 3 | Blocked by: 2, 8, 9 | Blocks: 12-18, 21
  References: `index.html:117-579`; `style.css`; `js/app-sections.mjs:1-35`; `docs/spec.md:15-21`.
  Acceptance criteria: `npm --prefix mobile test -- navigation --runInBand` 통과; 모든 핵심 화면이 320px 폭, 큰 글자, light/dark OS 설정에서 overflow 없음.
  QA scenarios: 게스트 Library→로그인 필요한 좋아요→성공 후 원래 화면 복귀 + 세션 만료/오프라인에서 로컬 화면 유지. Evidence `<attemptDir>/task-11-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-ui): add navigation and app shell`

- [ ] 12. 로컬 사진 보관함·상세·원본 보기 구현
  What to do / Must NOT do: 최근 사진, 날짜 그룹, 선택, 썸네일, 상세 메타데이터, 원본 전체화면, missing/limited 상태, 기기 삭제 OS 확인을 구현한다. 삭제를 앨범 제거/기기 삭제/클라우드 삭제와 혼용하지 않는다.
  Parallelization: Wave 3 | Blocked by: 3, 4, 6, 7, 11 | Blocks: 13, 14, 19, 21
  References: `index.html:152-330,600-653`; `js/personal-photo-selection.mjs`; `js/photo-exif-reader.mjs`; `docs/spec.md:32-39`.
  Acceptance criteria: `npm --prefix mobile test -- local-library --runInBand` 통과; 10k fixture에서 virtualized grid가 한 번에 100개 이하 cell을 mount.
  QA scenarios: 썸네일→원본→복귀와 다중 선택 + 외부 삭제/권한 회수/OS 삭제 취소가 정확한 상태 유지. Evidence `<attemptDir>/task-12-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-library): add device photo browsing`

- [ ] 13. 로컬 사진 지도·검색·위치 보정 구현
  What to do / Must NOT do: GPS 있는 로컬 사진의 cluster map, bounds 기반 목록, place search, exact 좌표 편집과 missing-location queue를 구현한다. 모바일 플랫폼 제한 Google Maps 키를 사용하고 사용자가 검색하지 않을 때 현재 위치 권한을 요구하지 않는다.
  Parallelization: Wave 3 | Blocked by: 6, 7, 11, 12 | Blocks: 14, 19, 21
  References: `index.html:379-473,654-703`; `js/explore-marker-clusters.mjs`; `js/location-workflow.mjs`; `functions/api/config.js`; `docs/spec.md:34-38`.
  Acceptance criteria: `npm --prefix mobile test -- local-map --runInBand` 통과; 5k pin fixture clustering과 bounds query가 500ms 이내.
  QA scenarios: 날짜/지도에서 동일 사진 선택·위치 보정 + Google Maps 실패/좌표 없음에서 목록 기능 유지. Evidence `<attemptDir>/task-13-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-map): add local photo map`

- [ ] 14. 가상 여행 앨범과 명시적 클라우드 스냅샷 구현
  What to do / Must NOT do: 로컬 album CRUD, 사진 순서·대표 이미지·날짜/장소 요약, missing asset 처리를 만들고 `클라우드에 저장/업데이트`가 명시적 snapshot을 생성하도록 outbox에 연결한다. 로컬 변경을 기존 공개 앨범에 자동 반영하지 않는다.
  Parallelization: Wave 3 | Blocked by: 4, 6, 7, 10-13 | Blocks: 19-21
  References: `auth.js:487-645`; `js/album-detail-edit-state.mjs`; `js/travel-days.mjs`; `js/travel-summary.mjs`; `index.html:332-377,475-536`.
  Acceptance criteria: `npm --prefix mobile test -- albums --runInBand`에서 create/reorder/cover/missing asset/snapshot/update divergence/partial failure가 통과.
  QA scenarios: 기기 사진 앨범 생성→공개 snapshot→로컬 재정렬 시 공개본 불변→수동 업데이트 + 원본 삭제 후 빈 자리 안내. Evidence `<attemptDir>/task-14-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-albums): add local albums and cloud snapshots`

- [ ] 15. 기존 클라우드 사진·앨범 관리와 삭제 의미 구현
  What to do / Must NOT do: 기존 private/link/public 사진·앨범 조회, 설명·날짜·위치 정밀도·공개범위 수정, 전체 좋아요, cloud delete를 구현한다. `앨범에서 제거`, `기기에서 삭제`, `클라우드 사본 삭제`를 분리하고 기기 삭제가 cloud/social data를 건드리지 않게 한다.
  Parallelization: Wave 3 | Blocked by: 8-12 | Blocks: 19-21
  References: `auth.js:331-448,487-672`; `index.html:233-284,600-703`; `js/visibility-label.mjs`; `js/photo-location-privacy.mjs`.
  Acceptance criteria: `npm --prefix mobile test -- cloud-management --runInBand`와 staging delete cascade assertions 통과.
  QA scenarios: 기존 cloud photo 편집/비공개 전환/삭제 + 로컬 원본 삭제 후 cloud 사본·좋아요·댓글 유지. Evidence `<attemptDir>/task-15-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-cloud): add cloud photo management`

- [ ] 16. Explore·좋아요·댓글·공개 프로필·공유 기능 완성
  What to do / Must NOT do: 공개 지도/목록/상세, mine/others scope, cluster, 좋아요 원자 RPC, 댓글 작성·삭제, 공개 앨범/프로필, 링크·native share·Kakao share를 구현한다. 비공개/hidden 좌표나 차단한 사용자를 노출하지 않는다.
  Parallelization: Wave 3 | Blocked by: 8, 9, 11 | Blocks: 18-21
  References: `index.html:379-579,600-643`; `auth.js:382-487`; `js/explore-discovery-panel.mjs`; `js/explore-marker-clusters.mjs`; `js/share-link.mjs`; `js/kakao-share.mjs`; `docs/spec.md:41-48`.
  Acceptance criteria: `npm --prefix mobile test -- explore social profile share --runInBand`와 staging `set_photo_like` concurrency test 통과.
  QA scenarios: anonymous Explore→로그인→좋아요/댓글/공유 + hidden location, 차단 사용자, signed URL 만료, 댓글 권한 실패. Evidence `<attemptDir>/task-16-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(mobile-social): reach web feature parity`

- [ ] 17. 앱 내 계정 삭제와 데이터 보존 처리 구현
  What to do / Must NOT do: 재인증, cloud rows/storage cleanup, auth user deletion을 서버 함수로 구현하고 앱 내 삭제와 공개 web request 경로를 제공한다. 기기 원본은 삭제하지 않으며 local metadata 삭제 여부를 별도 확인한다. service key는 서버에만 둔다.
  Parallelization: Wave 4 | Blocked by: 1, 5, 8, 11 | Blocks: 20, 21
  References: `supabase/schema.sql:434-490`; `docs/spec.md:50-56`; Apple account deletion guideline; Google Play account deletion requirements.
  Acceptance criteria: Supabase migration tests와 `npm --prefix mobile test -- account-deletion --runInBand` 통과; 삭제 후 cloud object 0, auth 접근 불가, 기기 원본 유지.
  QA scenarios: 재인증 후 삭제 완료 + 취소/최근 로그인 아님/Storage 일부 실패에서 재시도 가능한 상태. Evidence `<attemptDir>/task-17-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(account): add compliant account deletion`

- [ ] 18. UGC 신고·차단·운영자 처리 경로 구현
  What to do / Must NOT do: reports/blocks/moderation_actions migration과 RLS, 사진·댓글·프로필 신고, 사용자 차단, Explore/profile 필터링, 운영 runbook·지원 연락처를 구현한다. 클라이언트에 운영자 권한을 넣지 않는다.
  Parallelization: Wave 4 | Blocked by: 1, 5, 8, 9, 11, 16 | Blocks: 20, 21
  References: `auth.js:450-487`; `docs/spec.md:41-56`; Apple App Review Guideline 1.2; Google Play UGC policy.
  Acceptance criteria: migration/RLS tests와 `npm --prefix mobile test -- moderation --runInBand` 통과; 차단 관계가 Explore, 검색, 댓글, 프로필 모두에서 일관됨.
  QA scenarios: 사진/댓글 신고와 사용자 차단 즉시 반영 + 중복 신고/자기 자신 차단/권한 없는 moderation 거부. Evidence `<attemptDir>/task-18-mobile-app-local-photo-library.mp4`.
  Commit: Y | `feat(safety): add reporting and blocking`

- [ ] 19. 오프라인·성능·접근성·캐시 예산 충족
  What to do / Must NOT do: offline read/local write, cloud action queue 안내, pagination, image prefetch/cancel, cache eviction, reduced motion, screen reader, dynamic type를 다듬고 성능 fixture/측정 스크립트를 추가한다. offline 좋아요/댓글을 성공처럼 표시하지 않는다.
  Parallelization: Wave 4 | Blocked by: 4, 5, 7, 10, 12-16 | Blocks: 21
  References: `docs/spec.md:58-64`; `test/performance-budget.test.mjs`; task 5 policy; verification budgets above.
  Acceptance criteria: `npm --prefix mobile run perf:test && npm --prefix mobile run a11y:test`가 모든 예산을 통과하고 측정 JSON을 생성.
  QA scenarios: 10k library 스크롤/foreground sync + 비행기 모드에서 local album 편집은 유지되고 cloud action은 명시적 대기/실패. Evidence `<attemptDir>/task-19-mobile-app-local-photo-library.json`.
  Commit: Y | `perf(mobile): enforce offline and performance budgets`

- [ ] 20. 웹·앱 교차 클라이언트 migration과 회귀 검증
  What to do / Must NOT do: 모든 신규 migration을 backward-compatible하게 적용하고 mobile-created private/link/public 자료, likes/comments, album snapshot, account deletion, block filtering이 기존 웹에서 맞게 보이는지 검증한다. mobile release 전에 schema를 적용하되 기존 웹을 깨는 rename/drop은 금지한다.
  Parallelization: Wave 4 | Blocked by: 1, 8-10, 14-18 | Blocks: 21
  References: `docs/spec.md:66-72`; `package.json:6-22`; `supabase/migrations`; `test/*supabase*`; `test/*explore*`; task 1 contract.
  Acceptance criteria: staging migration rehearsal 후 `npm test && npm run build && npm run perf:budget && npm --prefix mobile test -- cross-client --runInBand` 모두 통과; rollback/runbook 작성.
  QA scenarios: 앱에서 만든 공개 앨범을 웹 Explore/profile/share에서 확인 + 이전 웹 번들로 새 nullable 필드/blocked rows 처리. Evidence `<attemptDir>/task-20-mobile-app-local-photo-library.md`.
  Commit: Y | `test(integration): verify web mobile compatibility`

- [ ] 21. 실제 기기 E2E와 스토어 출시 후보 완성
  What to do / Must NOT do: iOS/Android preview build, Maestro 전체 흐름, fresh OAuth, 권한 matrix, 외부 삭제, process death, iCloud, signed URL expiry, account switch, account deletion, moderation, 개인정보 문서, screenshots, age rating, reviewer account를 준비한다. 권한 선언 승인 없이 production 제출하지 않는다.
  Parallelization: Wave 4 | Blocked by: 3, 11-20 | Blocks: Final verification
  References: `docs/spec.md:74-79`; `docs/audits/full-service-audit-2026-08-10.md`; `eas.json` (planned); Apple/Google release policies.
  Acceptance criteria: `npm --prefix mobile run release:check`와 iOS/Android `maestro test mobile/e2e` 통과; TestFlight/Play internal build install 성공; privacy manifest/Data Safety 체크리스트 누락 0.
  QA scenarios: 새 계정으로 로컬 사진→지도→앨범→명시적 공개→웹 확인→신고/차단→계정 삭제 전체 흐름 + 권한 거부/네트워크 단절/앱 강제 종료 failure matrix. Evidence `<attemptDir>/task-21-mobile-app-local-photo-library.md`.
  Commit: Y | `chore(mobile): prepare store release candidate`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit: 모든 Must have, guardrail, 21개 acceptance와 evidence를 대조하고 누락 0을 증명.
- [ ] F2. Code quality review: mobile/web/backend diff의 타입, 보안, RLS, 개인정보, migration, 테스트 품질을 독립 검토해 P0/P1 0.
- [ ] F3. Real manual QA: 연결된 iOS/Android 실제 기기와 배포된 web preview에서 task 21 happy/failure matrix 재실행.
- [ ] F4. Scope fidelity: 원본 자동 업로드·OS 앨범 조작·로컬 자동 공개 동기화·비밀 키 번들이 없음을 정적/런타임 감사.

## Commit strategy
- 각 todo는 테스트와 구현을 한 원자 커밋으로 묶고 위 Commit 문구를 기본으로 사용한다.
- Supabase migration은 additive/backward-compatible 커밋으로 먼저 적용하고, web/mobile 소비 코드는 뒤 커밋에서 활성화한다.
- `dev`에 preview와 내부 배포 검증을 완료한 뒤에만 사용자의 명시적 승인으로 `main`/production을 갱신한다.
- 생성된 빌드, 서명 파일, 실제 `.env`, 네이티브 비밀값, 개인 사진 fixture는 커밋하지 않는다.

## Success criteria
- iOS/Android에서 기기 사진 원본을 서버에 자동 저장하지 않고 그리드·원본·지도·가상 앨범으로 사용할 수 있다.
- 앱 재실행, 권한 변경, 외부 삭제, iCloud 지연, Android 볼륨 변경에도 사진 수·핀·앨범이 손상 없이 재조정된다.
- 명시적 cloud action만 private/link/public 사본을 만들고, 중단·재시도에도 중복 DB/Storage object와 임시 파일이 남지 않는다.
- 기존 웹 계정과 cloud 사진·앨범·프로필·좋아요·댓글·공유가 앱과 동일 RLS 아래 상호 운용된다.
- 이메일/Google/Kakao/Apple 로그인, 복구, 계정 삭제, 신고·차단이 스토어 정책과 실제 기기 QA를 통과한다.
- mobile lint/typecheck/unit/component/export/Maestro, backend RLS/migration, 기존 web test/build/performance gate가 모두 통과한다.
- 서버에 저장되지 않은 로컬 사진은 웹/다른 기기/계정에서 보이지 않는다는 경계가 UI와 개인정보 문서에 명확하다.
