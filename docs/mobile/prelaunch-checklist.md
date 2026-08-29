# Ikkyee 모바일 앱 출시 전 체크리스트

**작성일:** 2026-08-21
**출시 목표:** 첫 iOS·Android 공개 베타
**현재 단계:** 자동 검증을 통과한 코드 출시 후보 단계이며, 서명 실기기·운영 백엔드·스토어 관문 전에는 베타 배포 후보가 아님

## 현재 진행 상황

**전체 99개 중 62개 완료(62.6%), 37개 남음 — 2026-08-28 기준**

### 지금까지 완료한 것

- 웹과 같은 공개 사진 랜딩을 첫 화면으로 두고, 고정 하단 탭 없이 계정 메뉴와 Explore 진입을 제공하는 방향을 확정했다.
- Expo Router, TypeScript, Jest, 린트, 내보내기, EAS 기본 구성을 만들었다.
- 로컬 사진 데이터 모델, SQLite 스키마·마이그레이션·복구 기반을 구현했다.
- Supabase 공개 클라이언트와 안전한 세션 저장·복원·갱신·로그아웃을 구현했다.
- 이메일 로그인·가입·비밀번호 복구와 Google·Kakao OAuth 클라이언트 흐름을 구현했다.
- 인증 콜백, PKCE 코드 교환, 새 비밀번호 화면을 구현했다.
- 실제 사진 권한 요청과 전체·제한·거부·회수 상태, 허용된 사진 미리보기를 `내 사진`에 연결했다.
- 250개 단위 MediaLibrary 증분 스캔, 중단 재개, 오프셋 변경 감지, SQLite tombstone 대조를 구현했다.
- Android `noBackupFilesDir`와 iOS 백업 제외 Application Support 디렉터리를 제공하는 로컬 Expo 모듈을 만들고 `내 사진` 화면 인덱싱에 연결했다.
- 최대 512MiB LRU 썸네일 캐시와 안전한 EXIF·위치·Live Photo 메타데이터 보강을 `내 사진` 흐름에 연결했다.
- `내 사진`의 처리 중 미리보기 뒤 최종 격자를 백업 제외 SQLite의 최신순 조회 결과로 교체했다.
- SQLite에 위치가 있는 기기 사진을 외부 지도 요청 없는 비공개 로컬 지도에 표시했다.
- 기기 원본 메타데이터와 로컬·클라우드 게시 상태를 구분하는 사진 상세 화면을 연결했다.
- 위치 없는 사진 감지와 외부 요청 없는 비공개 수동 위치 보정·저장을 구현했다.
- 비공개 저장·링크 공유·공개 게시를 위한 명시적 사진 선택과 업로드 전 검토 화면을 구현했다.
- 기기 원본을 변경하지 않는 임시 JPEG 게시용 파생본 축소·압축과 만료·권한 회수 정리를 구현했다.
- 게시용 JPEG 파생본에서 EXIF·GPS·XMP·ICC·IPTC·댓글 메타데이터를 바이트 단위로 제거하고 재검증한다.
- 비공개·공개 목적은 최종 확인 뒤에만 소유자 경로로 업로드하고, 실패를 백업 제외 SQLite의 재시도 작업으로 기록하는 실행 기반을 구현했다.
- 게시 준비 취소, 같은 사진의 중복 제출, 앱 프로세스 중단 작업 복구와 여러 장 중 부분 실패 처리를 구현했다.
- 빈 로컬 Supabase에서 전체 마이그레이션을 재생하고, 원문 토큰을 서버에 저장하지 않는 모바일 링크 공유와 전용 수신 화면을 구현했다.
- Explore의 고정 예시 핀을 공개 사진 페이지 조회와 5분 서명 이미지, 요청 취소·더 보기·빈 상태·재시도로 교체했다.
- Explore 미리보기에서 공개 사진 전체 상세와 공개 작성자 프로필로 이동하는 안전한 조회 흐름을 구현했다.
- 좋아요 탭의 공개 사진 목록과 상세의 낙관적 좋아요·취소, 실패 되돌리기를 구현했다.
- 공개 사진 상세의 댓글 조회·작성·본인 삭제와 서버 측 입력·도배 제한을 구현했다.
- 공개 사진 신고·사용자 차단·차단 해제와 운영자 대응 절차를 구현했다.
- 로그인 프로필의 이름·소개·메타데이터 제거 아바타 편집과 전용 공개 아바타 Storage 정책을 구현했다.
- 로그인 프로필에 최근 공개 사진 요약, 안전한 재시도, 사진 상세 이동을 연결했다.
- 확인 문구를 요구하는 계정 삭제 UI와 기기 파생 데이터, Storage, DB, Auth 순차 정리를 구현했다.
- 웹에서 삭제·비공개·링크 해제한 사진을 모바일 재 focus·foreground 시 재검증해 공개 화면에서 제거한다.
- 5분 서명 이미지를 focus 중 4분 30초마다 갱신하고 오프라인 재시도·private Storage 차단을 검증했다.
- 모바일 소스에 웹 전용 앨범 테이블·RPC·라우트·저장소가 추가되지 않도록 자동 경계 테스트를 고정했다.
- Explore에 네이티브 Places 장소 검색과 익명·로그인별 공개 사진 범위 선택을 연결했다.
- 웹 `1be7f51` 기준 랜딩 문구·지도 CTA·단순 로그인·공통 기본 아바타·사진 상세 UI를 동기화했다.
- 로그인 사용자의 Explore는 모든 소유 위치 사진에 맞춰 시작하며, 비공개 사진은 owner-only 원본 위치로 본인 지도에만 표시한다.
- 지도 군집은 여유 공간이 있는 분해 시점으로 애니메이션 확대하고, 상세는 안전한 Explore 위치 이동과 exact 전용 거리뷰 이동을 제공한다.
- 운영 공유 URL을 토큰이 서버에 전달되지 않는 HTTPS fragment 방식으로 전환하고 iOS Universal Links·Android App Links 구성과 앱 미설치 대체 화면을 구현했다.

### 아직 남은 핵심 작업

- 실제 iPhone·Android에서 디자인, 딥링크, OAuth, 사진 권한을 검증해야 한다.
- Google·Kakao 공급자 콘솔과 Supabase 리디렉션 허용 목록을 운영 환경에 등록해야 한다.
- 운영 지도 키에 Places API (New)를 허용하고 서명 빌드에서 검색·지도 오류를 검증하며, 로컬에서 검증한 링크 토큰 정책을 운영 Supabase에 적용해야 한다.
- Apple Team ID와 Android 출시 서명 SHA-256을 Cloudflare에 등록한 뒤 유니버설 링크·앱 링크를 배포·실기기 검증해야 한다.
- 서명된 빌드, 스토어 자료, 보안·성능·실기기 QA와 출시 승인이 필요하다.

### 바로 다음 작업

1. 서명된 iOS·Android 빌드에서 랜딩, 로그인, Explore 내 사진 범위, 군집 확대, 상세→지도 이동, exact 거리뷰를 확인한다.
2. Google·Kakao 운영 자격 증명과 `ikkyee://auth/callback` 허용 목록을 등록하고 실제 계정 로그인·회원가입을 검증한다.
3. 로컬 검증을 마친 모바일 링크 마이그레이션과 Edge Function을 운영 Supabase에 안전하게 적용하고 RLS·Storage를 재검증한다.
4. 고정한 운영 도메인에 Apple Team ID·Android 출시 서명 SHA-256을 등록하고 설치·미설치 수신 흐름을 검증한다.
5. TestFlight·Google Play 내부 테스트 배포 대상을 확정하고 스토어 자료와 운영 연락처를 승인한다.

## 체크리스트 운영 원칙

- 이 문서는 고정된 모바일 출시 원장이다. 추가한 항목을 삭제하거나 번호 체계를 임의로 바꾸지 않는다.
- 완료할 때 `[ ]`를 `[x]`로 바꾸고 날짜가 포함된 근거 파일 또는 명령 결과를 기록한다.
- 보류 항목은 체크하지 않고 `보류`라고 표시한다. 보류는 완료가 아니다.
- 새 출시 요건은 관련 절의 끝에 추가한다.
- 모바일 앱에는 앨범 기능을 넣지 않는다. 별도 제품 결정 없이는 웹 앨범과 향후 웹 AI 앨범 작업을 모바일 범위에 포함하지 않는다.
- 앞으로 새 항목과 진행 기록은 한글로 작성한다. 파일명, 명령어, API 이름 같은 기술 식별자는 원문을 유지한다.

## 1. 제품 및 출시 결정

- [x] 웹과 같은 공개 사진 랜딩을 기본 화면으로 정하고 고정 하단 탐색 대신 사진 추가·로그인/계정·Explore 진입을 제공한다. 근거: `docs/mobile/product-definition.md`, `docs/mobile/web-parity-2026-08-27.md`, `mobile/src/LandingScreen.tsx` (2026-08-28).
- [x] 모바일 앱에서 앨범 생성·편집·목록·공유를 제외한다. 근거: `docs/mobile/product-definition.md`, `mobile/src/backend-policy-contract.json`.
- [x] 첫 출시의 기기 미디어 및 개인정보 경계를 정의한다. 근거: `docs/mobile/adr/0001-native-media-boundary.md`, `docs/mobile/privacy-media-policy.md`.
- [ ] 실제 iPhone과 Android 화면에서 운영용 모바일 디자인 방향을 승인한다.
- [ ] 첫 배포 대상을 TestFlight·내부 테스트, 비공개 베타, 공개 스토어 중에서 정한다.
- [x] 최소 지원 OS 버전과 기기 등급을 확정한다. iPhone 전용 iOS 16.4와 Android 7.0(API 24)을 설치 하한으로 고정하고, 오래된·현재 iPhone과 RAM 4GiB·6GiB Android 실기기 QA 등급 및 최소 1,024MiB 여유 공간을 정의했다. `expo-build-properties`와 CI drift 검사를 연결하고 임시 production prebuild에서 Android `minSdkVersion=24`, iOS deployment target `16.4` 생성을 확인했다. 근거: `mobile/platform-support.json`, `mobile/app.config.js`, `mobile/scripts/verify-platform-support.mjs`, `docs/mobile/platform-support.md`, `test/mobile-platform-support.test.mjs` (2026-08-26). 실기기 서명 release 검증은 별도 항목으로 유지한다.
- [ ] 출시 책임자, 장애 연락 담당자, 공개 지원 이메일을 지정한다.
- [ ] 모바일 개인정보 안내, 계정 삭제 방법, 데이터 보존 문구를 승인한다.

## 2. 프로젝트 기반

- [x] Expo Router 앱 골격을 만들고 의존성 버전을 고정한다. 근거: `mobile/package.json`, `mobile/package-lock.json`.
- [x] TypeScript, 린트, Jest, 스키마 검증, 내보내기, Maestro, Supabase 스크립트를 추가한다. 근거: `mobile/package.json`.
- [x] 비밀값이 없는 환경 변수 예시를 추가한다. 근거: `mobile/.env.example`.
- [x] Expo와 EAS 초기 설정 파일을 추가한다. 근거: `mobile/app.json`, `mobile/eas.json`.
- [ ] Apple·Google·Expo 계정에서 최종 iOS 번들 식별자와 Android 패키지명을 확인한다.
- [ ] 최종 사용자 정의 URL 스킴과 유니버설 링크·앱 링크를 등록하고 검증한다. `ikkyee` 스킴과 운영 `https://practice-week1-cws.pages.dev/photo-link`, preview 대응 도메인을 고정하고 iOS Associated Domains와 Android `autoVerify` intent filter를 prebuild 산출물에서 확인했다. AASA·`assetlinks.json`은 필요한 식별자가 없으면 404로 닫히며 로컬 Cloudflare 런타임에서 응답 형식·캐시·무리디렉션을 검증했다. Apple Team ID, Android 출시 서명 SHA-256의 Cloudflare 환경 등록과 배포 후 서명 실기기 수신은 외부 관문으로 남아 미완료다. 근거: `mobile/app.config.js`, `functions/.well-known/`, `functions/_shared/mobile-link-association.mjs`, `docs/mobile/universal-links.md`, `test/mobile-universal-link-contract.test.mjs`, `test/mobile-google-maps-config.test.mjs` (2026-08-26).
- [ ] 로컬·미리보기·운영 Supabase 환경을 분리한다. 앱 코드와 EAS build profile의 `development`·`preview`·`production` 구분은 구현했다. development는 loopback·사설 IP, preview는 운영과 다른 HTTPS Supabase ref, production은 웹과 공유하는 `pqczcponriukilrtpbdl` ref만 허용한다. preview·production은 publishable key만 허용하고 legacy anon fallback·service-role·secret 형태를 거부한다. 근거: `mobile/src/supabase-client.ts`, `mobile/eas.json`, `mobile/.env.example`, `mobile/__tests__/supabase-client.test.ts`, `mobile/__tests__/backend-environment-config.test.ts`, `docs/mobile/backend-environments.md` (2026-08-25). 별도 Preview Supabase 프로젝트 생성, EAS 세 environment의 실제 URL·publishable key 등록, 서명 빌드 왕복이 남아 있어 미완료로 유지한다.
- [ ] EAS 비밀값 저장소를 구성하고 서비스 역할 키나 공급자 비밀값이 클라이언트 번들에 들어가지 않게 한다.
- [ ] 깨끗한 체크아웃에서 재현 가능한 iOS·Android 개발 빌드를 만든다.

## 3. 디자인 및 화면 이동

- [x] 모바일 디자인 토큰, 반응형 제약, 접근성 규칙, 상호작용 원칙을 문서화한다. 근거: `docs/mobile/DESIGN.md`.
- [x] 클릭 가능한 정적 제품 시제품을 만든다. 근거: `docs/mobile/prototype/index.html`.
- [x] 프로필 진입점과 3개 탭이 있는 초기 네이티브 Explore 화면을 만든다. 근거: `mobile/app/(tabs)/index.tsx`.
- [x] Explore, 내 사진, 좋아요, 프로필, 인증, 사진 상세, 위치 편집, 게시 확인의 운영용 화면 이동을 완성한다. 3개 기본 탭, 게스트·인증·비밀번호 복구, 로컬 사진 상세·위치, 게시 검토, 공개 사진·작성자, HTTPS·custom scheme 토큰 링크의 14개 라우트 파일과 핵심 이동 간선을 계약 테스트로 고정했다. 상세·편집은 stack back, 인증 완료는 replace, 공개 화면은 ID만 전달한 후 재조회하며 앱 특유 앨범 라우트는 없다. 근거: `mobile/src/mobile-routes.ts`, `mobile/app/`, `mobile/__tests__/mobile-routes.test.ts`, 화면별 이동 테스트, `test/mobile-navigation-contract.test.mjs`, `docs/mobile/navigation-contract.md` (2026-08-26).
- [ ] 모든 화면에 로딩, 빈 상태, 오프라인, 권한 거부, 복구 가능한 오류 상태를 구현한다. 주요 화면 상태 매트릭스를 `docs/mobile/accessibility-state-audit.md`에 기록했다. 공유 링크는 만료·해제·잘못된 토큰을 같은 unavailable 상태로 유지하면서 Supabase Relay·Fetch·5xx만 네트워크 장애로 분리해 재시도한다. Explore는 최초 오프라인에서 요청을 차단하고 연결 안내를 표시하며, 추가 페이지 오프라인·네트워크 실패 때 기존 사진과 선택 상태를 보존한 채 재시도한다. Explore 미리보기, 공개 상세, 좋아요, 공개 프로필, 내 프로필 공개 요약, 비공개 링크의 원격 이미지 실패는 안전한 대체 상태를 표시하고 현재 공개 범위나 비밀 링크를 다시 검증해 새 서명 URL을 받는다. 내 사진 격자와 기기 사진 상세의 로컬 썸네일 실패는 해당 캐시 한 장만 제거하고 원본에서 다시 생성하며, 원본 접근 실패 시 내부 경로 없이 재시도 상태를 유지한다. 인증 공급자 원시 오류는 프로필·세션 화면에서 숨긴다. 실제 OS 오프라인 전환과 백그라운드 복귀 실기기 확인이 남아 있어 미완료다. 근거: `mobile/src/RecoverableRemoteImage.tsx`, `mobile/src/RecoverableDeviceThumbnail.tsx`, 이미지 사용 화면들, `mobile/src/explore-connectivity.ts`, `mobile/src/auth-session.tsx`, 관련 테스트 (2026-08-25).
- [ ] 360px·390px 너비, 안전 영역, 키보드 회피, 화면 회전 정책, 글자 확대를 검증한다. 세로 고정 정책을 Expo 설정과 계약 테스트로 고정했다. 로그인·비밀번호 변경·프로필 편집·계정 삭제·댓글·신고 입력은 공통 키보드 회피 스크롤에 넣었고 iOS 키보드 인셋·대화형 닫기, Android 높이 회피·드래그 닫기를 적용했다. 360px은 12px, 390px은 20px 좌우 여백을 적용한다. 근거: `mobile/src/KeyboardSafeScrollView.tsx`, `mobile/src/mobile-layout.ts`, `mobile/app.json`, 입력 화면들, 관련 테스트 (2026-08-26). 실제 안전 영역·최대 글자 크기·키보드 전환 시 버튼 잘림은 iOS·Android 실기기 확인이 남아 미완료로 유지한다.
- [ ] 스크린 리더 이름, 초점 순서, 대비, 모션 감소, 최소 44px 터치 영역을 점검한다. 모든 `Pressable`의 명시적 버튼 역할을 AST로 검사하고 탭 프로필·프로필 닫기·로컬 지도 마커를 최소 44pt로 보정했다. 핵심 일반 텍스트 색 조합의 WCAG AA 4.5:1 이상 대비를 계산하며 현재 의도적 화면 애니메이션이 없음을 확인했다. 근거: `mobile/__tests__/accessibility-contract.test.ts`, `docs/mobile/accessibility-state-audit.md` (2026-08-25). VoiceOver·TalkBack 실제 읽기 순서, 최대 글자 크기, 스위치 제어·외부 키보드와 렌더링 대비 검증은 실기기 관문이라 미완료다.
- [x] 시제품 전용 이미지와 조작 요소를 운영 및 스토어 사용이 허가된 자산으로 교체한다. 기존 Ikkyee 마크를 참조한 프로젝트 전용 앱 아이콘·적응형 전경·파비콘을 생성하고 출처·프롬프트·해시를 기록했다. preview·production은 실제 네이티브 지도 키가 없으면 빌드 구성이 실패하므로 일러스트 지도는 development·web 전용 안전 대체 화면이며 운영 앱 조작 요소가 아니다. 실기기 마스크·시작 화면과 스토어 스크린샷 승인은 별도 출시 QA 항목에 남겼다. 근거: `mobile/assets/`, `mobile/app.json`, `mobile/app.config.js`, `docs/mobile/app-assets.md`, `mobile/__tests__/app-assets-contract.test.ts`, `test/mobile-google-maps-config.test.mjs` (2026-08-26).

## 4. 기기 사진 보관함 및 로컬 데이터

- [x] iOS·Android 미디어 권한 및 기능 동작을 정의한다. 근거: `mobile/src/native-media-capabilities.json`.
- [x] 로컬 사진 모델, 동기화 상태, 삭제 표식, 게시 작업을 정의한다. 근거: `mobile/src/local-photo-domain.json`.
- [x] SQLite 스키마와 마이그레이션 실행기를 구현하고 테스트한다. 근거: `mobile/src/local-photo-database.ts`, `mobile/src/local-schema-migrations.json`.
- [x] 중단된 스캔과 게시 작업의 로컬 복구 동작을 정의한다. 근거: `mobile/src/local-photo-recovery.ts`.
- [x] 실제 시스템 사진 권한 요청을 열고 전체·제한·거부·권한 변경 상태를 처리한다. 근거: `mobile/src/device-photo-library.ts`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24).
- [x] MediaLibrary를 250개 단위로 증분 스캔하고 중단 재개·오프셋 변경·추가·수정·삭제 자산을 SQLite 체크포인트와 tombstone으로 맞춘다. 근거: `mobile/src/device-photo-scan.ts`, `mobile/src/device-photo-repository.ts`, `mobile/src/device-photo-indexer.ts`, 관련 테스트 (2026-08-24).
- [x] 실제 자산 메타데이터를 앱 화면에서 백업 제외 SQLite 저장소로 기록한다. 근거: `mobile/modules/ikkyee-local-storage/`, `mobile/src/native-local-photo-storage.ts`, `mobile/src/local-photo-indexing-runtime.ts`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24). 네이티브 자동 연결은 Android·Apple 모두 확인했으며 실기기 빌드 검증은 별도 항목으로 유지한다.
- [x] 제한된 크기의 썸네일·캐시를 만들고 정리 및 백업 제외 정책을 적용한다. 근거: `mobile/src/thumbnail-cache.ts`, `mobile/src/device-photo-thumbnail-cache.ts`, `mobile/src/device-photo-thumbnail-cleanup.ts`, `mobile/src/device-photo-thumbnails.ts`, 관련 테스트 (2026-08-24). 최대 512MiB, 쓰기 전 LRU 제거, SHA-256 키, 원본 삭제·권한 상실 정리를 적용했으며 실기기 파일 검증은 별도 항목으로 유지한다.
- [x] 누락·잘못된 메타데이터와 Live Photo를 포함해 EXIF 촬영 시각과 위치를 안전하게 읽는다. 근거: `mobile/src/device-photo-metadata.ts`, `mobile/src/device-photo-metadata-enricher.ts`, `mobile/src/device-photo-repository.ts`, 관련 테스트 (2026-08-24). GPS는 전용 열에만 저장하고 EXIF JSON의 GPS·중첩·과대 값은 제거하며 Live Photo paired video는 추출하지 않는다.
- [ ] 실제 기기에서 1,000개·10,000개 사진 보관함 성능을 검증한다.
- [x] 데이터베이스 마이그레이션, 손상 복구, 중단 스캔 복구, 앱 재설치를 검증한다. 근거: `mobile/__tests__/local-schema-database.test.ts`, `mobile/__tests__/device-photo-scan.test.ts`, `mobile/__tests__/local-photo-reinstall-integration.test.ts`, `mobile/scripts/verify-local-schema.mjs` (2026-08-25). 빈 DB 0→2 생성, v1 좌표·체크포인트 보존 업그레이드, 실패 migration 원자적 롤백·재시도, 손상 DB 대체본 재색인·검증·활성화와 중단 대체본 폐기, 저장 체크포인트 경계 확인 후 재개·드리프트 시 처음부터 재시작, 10,000개 실행 예산 이후 재개를 검증했다. 재설치는 새 백업 제외 DB를 OS 사진 참조로 재구성하며 원본 바이트와 OS 자산을 변경하지 않고, OS 삭제는 로컬 tombstone·썸네일만 정리한다.

## 5. 인증 및 공용 백엔드

- [x] 읽기 전용 Supabase 스키마, RLS, Storage, 웹 전용 앨범 경계를 기록한다. 근거: `docs/mobile/backend-contract.md`.
- [x] 계약 테스트용 로컬 Supabase 구성을 추가한다. 근거: `supabase/config.toml`.
- [x] 모바일 앱에 운영용 Supabase 클라이언트를 설치하고 구성한다. 근거: `mobile/src/supabase-client.ts`, `mobile/.env.example`, `mobile/__tests__/supabase-client.test.ts`.
- [x] 빈 로컬 데이터베이스에서 커밋된 Supabase 마이그레이션을 순서대로 재생할 수 있게 한다. 근거: `supabase/migrations/20260724000000_initial_remote_schema_baseline.sql`, `test/supabase-migration-baseline.test.mjs` (2026-08-24). `supabase db reset`으로 기준 스키마와 이후 증분 마이그레이션 전체를 빈 로컬 DB에 적용하고 로컬 migration history를 확인했다. 기존 원격 migration history와의 정합성 확인·운영 적용은 별도 배포 관문으로 유지한다.
- [x] 세션 저장, 만료, 갱신, 로그아웃, 로그아웃 상태 복구를 구현한다. 근거: `mobile/src/auth-session.tsx`, `mobile/src/email-auth.ts`, `mobile/src/supabase-client.ts` 및 관련 테스트.
- [ ] 이메일 가입·인증·로그인·비밀번호 재설정과 계정 연결 전체 흐름을 완성한다. 이메일 정규화·8자 비밀번호 검증, 가입 확인 메일, PKCE/implicit 콜백 세션, 로그인, 재설정 메일의 recovery intent, 새 비밀번호 일치 검증·저장과 안전한 재시도 화면을 구현하고 단위·화면 테스트로 검증했다. 같은 검증 이메일은 Supabase 자동 연결을 따르고, 다른 이메일·이메일 없는 Kakao는 로그인된 대표 프로필에서 명시적으로 Google·Kakao를 연결한다. 연결 전후 서버 사용자 ID가 다르면 새 로컬 세션을 폐기하며 앱은 연결 해제를 제공하지 않는다. 근거: `mobile/src/email-auth.ts`, `mobile/src/auth-callback.ts`, `mobile/src/account-identity-linking.ts`, `mobile/src/AccountIdentitySection.tsx`, 인증 화면, `docs/mobile/account-identity-linking.md`, 관련 테스트 (2026-08-26). 운영 이메일 전체 왕복, Supabase **Enable Manual Linking**, 공급자 설정과 서명 실기기 연결 검증이 남아 있어 미완료다.
- [x] 이메일·비밀번호 로그인, 가입 요청, 비밀번호 재설정 요청 화면과 클라이언트 동작을 구현한다. 근거: `mobile/app/auth/login.tsx`, `mobile/src/email-auth.ts`, `mobile/__tests__/email-auth.test.ts`.
- [x] 이메일 인증·비밀번호 복구 콜백 교환과 새 비밀번호 화면을 구현한다. 근거: `mobile/app/auth/callback.tsx`, `mobile/app/auth/update-password.tsx`, `mobile/src/auth-callback.ts`, `mobile/__tests__/auth-callback.test.ts` (2026-08-24).
- [x] 시스템 인증 세션, PKCE 콜백 교환, 취소, 공급자 오류 처리가 포함된 Google·Kakao OAuth 클라이언트 동작을 구현한다. 근거: `mobile/src/oauth-auth.ts`, `mobile/app/auth/login.tsx`, `mobile/__tests__/oauth-auth.test.ts`, `docs/mobile/oauth-redirect-setup.md` (2026-08-24).
- [ ] 운영 리디렉션 허용 목록을 포함한 Google OAuth를 iOS·Android에서 검증한다.
- [ ] 운영 리디렉션 허용 목록을 포함한 Kakao OAuth를 iOS·Android에서 검증한다.
- [ ] 이메일·Google·Kakao가 하나의 Ikkyee 대표 프로필을 사용하는지 검증한다. 대표 프로필 키를 Supabase Auth 사용자 ID로 고정하고 연결 과정에서 프로필 복사·병합 SQL이나 `user_metadata` 권한 판단을 하지 않는다. 프로필 설정에서 현재 identity를 서버 조회하고 누락된 Google·Kakao를 명시적으로 연결하며 콜백 뒤 사용자 ID 불변을 재검증한다. 운영 provider·manual linking 설정과 실제 세 계정 조합의 동일 `user.id`·`profiles` 행 확인이 남아 미완료다. 근거: `mobile/src/account-identity-linking.ts`, `mobile/src/AccountIdentitySection.tsx`, `mobile/app/profile.tsx`, `docs/mobile/account-identity-linking.md`, 관련 테스트 (2026-08-26).
- [x] 프로필 이름·아바타 편집과 공용 기본 아바타 동작을 구현한다. 근거: `mobile/src/ProfileEditor.tsx`, `mobile/src/profile-editor-repository.ts`, `mobile/src/avatar-image-runtime.ts`, `mobile/app/profile.tsx`, `mobile/src/public-profile-repository.ts`, `supabase/migrations/20260824124935_add_mobile_profile_editing.sql`, 관련 테스트 (2026-08-25). 로그인 프로필에서 이름 40자·소개 300자 편집, 사진 선택·미리보기·제거·기본 이니셜 아바타를 제공한다. 선택 이미지는 최대 변 512px·품질 0.82 JPEG로 다시 렌더링하고 APP/COM 메타데이터 부재를 검증한 2MiB 이하 바이트만 전송한다. 새 불변 경로를 먼저 업로드하고 프로필 행 전환 실패 시 새 객체를 보상 삭제하며, 성공 뒤 이전 객체를 정리한다. 기존 웹·OAuth `avatar_url`은 호환용으로 유지하되 모바일 `avatar_path`를 공개 프로필에서 우선한다.
- [x] 모바일 클라이언트에서 소유자·다른 사용자·익명 RLS 및 Storage 테스트를 다시 실행한다. 근거: `mobile/scripts/verify-profile-policy.mjs`, `mobile/scripts/verify-profile-storage.mjs`, `test/mobile-profile-editing-policy.test.mjs` (2026-08-25). 빈 로컬 Supabase 전체 마이그레이션 재생 뒤 실제 publishable-key 클라이언트로 소유자 JPEG 업로드·프로필 수정·삭제, 다른 사용자 폴더 업로드·목록·프로필 수정·삭제 차단, 익명 공개 프로필·아바타 다운로드, MIME 제한을 왕복 검증했다. DB 역할 검증으로 입력 정규화, 경로 제약, 2MiB 버킷 제한, 트리거 직접 실행 거부와 UPDATE Storage 정책 부재도 확인했다. 운영 원격 적용·재검증은 별도 출시 관문이다.
- [x] 서명 URL 만료·갱신·오프라인 처리와 비공개 객체 접근 거부를 검증한다. 근거: `mobile/src/content-visibility-refresh.ts`, `mobile/__tests__/content-visibility-refresh.test.tsx`, `mobile/scripts/verify-photo-storage-access.mjs`, `supabase/migrations/20260825085451_restore_private_photo_storage_policies.sql`, `docs/mobile/content-visibility-cache.md` (2026-08-25). focus 중 270초마다 300초 서명 URL과 현재 공개 행을 재조회하고 background·focus 해제 시 갱신을 중지한다. 네트워크 실패 시 기존 서명 이미지를 유지하지 않고 재시도로 복구한다. 빈 로컬 Supabase 재생 후 소유자 private 접근, 익명·비소유자 public 서명 조회, private 서명·직접 다운로드 거부, 만료 URL 거부, public→private 전환 후 신규 URL 발급 거부를 실제 publishable-key 클라이언트로 확인했다. 운영 마이그레이션 정합성 확인·배포·원격 재검증은 별도 관문이다.

## 6. Explore

- [ ] 최종 iOS·Android 앱 식별자로 제한한 운영 지도 SDK와 키를 연결한다. Expo SDK 57 권장 `react-native-maps` 1.27.2를 iOS·Android Google 공급자로 연결했다. 두 플랫폼 키가 함께 있어야 동적 Expo config가 네이티브 지도를 활성화하고 preview·production은 누락·부분 설정을 빌드 전에 거부한다. 키가 없는 development·web은 외부 요청 없는 대체 지도를 유지한다. 근거: `mobile/app.config.js`, `mobile/src/ExploreMapSurface.native.tsx`, `test/mobile-google-maps-config.test.mjs`, `docs/mobile/native-map-setup.md` (2026-08-26). Google Cloud SDK 활성화, Android 패키지·SHA-1과 iOS 번들 ID 제한, EAS 키 등록·서명 빌드 검증은 외부 관문이라 미완료로 유지한다.
- [x] 현재 지도 영역의 사진을 범위별 페이지네이션과 요청 취소로 불러온다. 익명·다른 사람 범위는 `visibility = 'public'`과 `approximate`·`exact`만 조회한다. 로그인 사용자의 `내 사진`은 owner-only `photo_private_locations`를 먼저 조회해 공개 여부와 무관하게 위치가 있는 소유 사진만 결합하며, 다른 사용자는 해당 원본 좌표를 읽을 수 없다. 20개 단위 조회, 5분 Storage 서명 URL, 중복 제거, 더 보기, 빈 상태, 재시도를 공통 적용한다. 근거: `mobile/src/explore-photo-repository.ts`, `mobile/app/(tabs)/index.tsx`, 관련 테스트 (2026-08-28).
- [x] 안정적인 마커 군집, 선택 상태, 지도 영역 보존과 군집 분해 애니메이션을 구현한다. 현재 bounds의 화면 비율 5% 임계로 인접 셀까지 비교하고, 군집을 누르면 원본 좌표 bounds에 여유를 둔 시점으로 380ms 확대한다. 확대 뒤 기존 선택 사진을 보존하고 동일 좌표는 반복 선택할 수 있다. 로그인 첫 진입은 모든 소유 위치 사진의 bounds에 여유를 더해 맞춘다. 근거: `mobile/src/explore-marker-clusters.ts`, `mobile/src/ExploreMapSurface.native.tsx`, `mobile/app/(tabs)/index.tsx`, 관련 테스트 (2026-08-28).
- [x] 장소 검색과 사진 범위 선택을 구현한다. Android Places SDK 5.1.1과 iOS Places SDK 9.4.0 Text Search에 제한된 플랫폼 키를 연결하고 `Powered by Google`을 표시한다. 익명은 공개 사진, 로그인 사용자는 `다른 사람 사진` 또는 비공개를 포함한 `내 사진`을 선택한다. 다른 사람 범위에는 공개 위치 정책을 유지하고 내 사진 원본 위치는 RLS 소유자에게만 사용한다. 근거: `mobile/modules/ikkyee-place-search/`, `mobile/src/explore-photo-scope.ts`, `mobile/src/explore-photo-repository.ts`, `mobile/app/(tabs)/index.tsx`, 관련 테스트 (2026-08-28).
- [x] 사진 미리보기와 전체 상세 화면을 구현한다. 상세는 서명 이미지, 스크롤 단서, 제목 높이의 안전 메뉴, 하트 전용 좋아요와 reduced-motion 대응 모션, `-- --` 날짜 대체, 소유자 전용 공개 상태를 제공한다. 위치가 공개 가능한 사진은 Explore의 해당 좌표·범위로 이동하고 exact만 외부 Google Maps 거리뷰를 연다. 숨김·근사 위치는 거리뷰 원본 좌표로 사용하지 않는다. 근거: `mobile/app/explore-photo/[photoId].tsx`, `mobile/src/public-photo-detail-repository.ts`, 관련 테스트 (2026-08-28).
- [x] 비공개 프로필이나 위치를 노출하지 않는 작성자 프로필 이동을 구현한다. 근거: `mobile/app/explore-photo/[photoId].tsx`, `mobile/app/public-profile/[userId].tsx`, `mobile/src/public-profile-repository.ts`, 관련 테스트 (2026-08-24). 사진 상세의 작성자에서 공개 프로필로 이동하고 `profiles` 공개 필드와 해당 작성자의 `visibility = 'public'` 사진 최신 12장만 조회한다. 위치 열·비공개 사진·Storage 경로·사용자 ID는 화면에 표시하지 않는다.
- [x] 숨김·근사·정확 공개 위치 동작을 운영 정책과 대조한다. 웹·모바일이 같은 Supabase 행·RLS·`apply_photo_location_privacy` 트리거를 사용하는 것을 확인했다. 모바일 Explore는 `public` 중 `approximate`·`exact`만 쿼리하고 반환 행을 다시 검증해 좌표가 남은 과거 `hidden` 행도 핀으로 노출하지 않는다. 현재 모바일 신규 게시는 위치 선택 UI가 없어 모두 `hidden`으로 저장하며 모바일에서 정확 위치를 공개할 수 있다고 주장하지 않는다. 근거: `docs/mobile/public-location-policy-audit.md`, `mobile/src/explore-photo-repository.ts`, `mobile/src/publication-publisher.ts`, `test/mobile-public-location-policy-audit.test.mjs` (2026-08-26).
- [ ] 오프라인, 검색 결과 없음, 지도 키, 할당량, 네트워크 오류 복구 상태를 추가한다. Expo Network의 실제 연결 상태를 읽어 최초 오프라인에서는 공개 사진 요청을 보내지 않고 연결 후 재시도를 제공한다. 추가 페이지 요청 직전과 실패 직후에도 연결 상태를 다시 확인해 오프라인과 일반 네트워크 실패를 구분하고 이미 불러온 사진·선택 상태·다음 offset을 유지한다. 장소 검색은 결과 없음·오프라인·일반 실패·모듈 누락·키 사용 불가와 Android/iOS 공급자의 네트워크·할당량·키 제한 오류를 네이티브에서 안전한 앱 코드로 분류한다. 네트워크·할당량·일반 실패는 같은 검색어 재시도, 빌드 누락·키 설정 오류는 무의미한 반복 재시도를 막는다. 동적 config는 development 누락 키를 안전한 대체 지도로 전환하고 preview·production 누락·부분 키를 빌드 전에 거부한다. 실제 제한·할당량 응답과 복구를 서명 빌드에서 재현하는 외부 검증이 남아 미완료로 유지한다. 근거: `mobile/src/explore-connectivity.ts`, `mobile/src/place-search-runtime.ts`, `mobile/modules/ikkyee-place-search/`, `mobile/app.config.js`, `mobile/app/(tabs)/index.tsx`, `docs/mobile/native-map-setup.md`, 관련 테스트 (2026-08-26).
- [ ] 저사양·중간 사양 기기에서 지도 시작, 이동·확대, 메모리, 배터리를 측정한다.

## 7. 내 사진 및 게시

- [x] 실제 로컬 저장소에서 기기 사진 격자를 표시한다. 근거: `mobile/src/device-photo-repository.ts`, `mobile/src/local-photo-indexing-runtime.ts`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24). 권한 직후에는 MediaLibrary 미리보기를 먼저 표시하고, 인덱싱 성공 뒤에는 백업 제외 SQLite의 최신순·페이지 제한 조회 결과로 교체하며 DB 처리 실패 때만 미리보기를 유지한다.
- [x] 위치가 있는 기기 사진을 비공개 로컬 지도에 표시한다. 근거: `mobile/src/private-photo-map.tsx`, `mobile/src/device-photo-repository.ts`, `mobile/src/local-photo-indexing-runtime.ts`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24). SQLite에서 좌표가 모두 있는 최신 사진을 최대 500개까지 별도 조회하고 원시 좌표 문자열이나 외부 지도 요청 없이 로컬 좌표 평면에 투영하며, 위치 없음·선택 상태와 목록/지도 전환을 제공한다.
- [x] 원본 메타데이터와 로컬·클라우드 상태가 분명한 사진 상세를 구현한다. 근거: `mobile/app/device-photo/[assetId].tsx`, `mobile/src/device-photo-repository.ts`, `mobile/src/local-photo-indexing-runtime.ts`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24). 격자와 비공개 지도에서 동적 상세 경로를 열고 SQLite의 미디어 형식·해상도·촬영 시각·비공개 위치 존재 여부와 최근 게시 작업 상태를 구분해 표시한다. 정확한 좌표와 EXIF 원문은 화면과 로그에 표시하지 않는다.
- [x] 위치 누락 감지와 수동 지도 보정을 구현한다. 근거: `mobile/src/device-photo-location.ts`, `mobile/src/local-photo-location-runtime.ts`, `mobile/app/device-photo/[assetId]/location.tsx`, `mobile/app/device-photo/[assetId].tsx`, `mobile/app/(tabs)/my-photos.tsx`, 관련 테스트 (2026-08-24). SQLite 조회가 끝난 격자에서 위치 누락을 표시하고 상세 화면에서 위치 추가·수정으로 진입한다. 전 세계 범위 로컬 좌표 지도에서 선택한 지점은 백업 제외 SQLite에만 저장하며 좌표 문자열이나 외부 지도 요청을 만들지 않는다.
- [x] 비공개 클라우드 저장, 링크 공유, 공개 게시를 위한 명시적 사진 선택을 구현한다. 근거: `mobile/src/publication-selection.ts`, `mobile/app/(tabs)/my-photos.tsx`, `mobile/app/publish/review.tsx`, 관련 테스트 (2026-08-24). 기기 사진을 최대 20장까지 직접 선택하고 세 가지 게시 목적 중 하나를 고른 뒤 별도 검토 화면에서 다시 확정한다. 이 단계에서는 업로드·게시 작업을 만들거나 외부로 사진을 전송하지 않는다.
- [x] 기기 원본을 바꾸지 않고 게시용 파생 이미지를 축소·압축한다. 근거: `mobile/src/publication-derivative.ts`, `mobile/src/publication-derivative-runtime.ts`, `mobile/app/publish/review.tsx`, 관련 테스트 (2026-08-24). 명시적 검토 확인 뒤 선택한 정지 사진을 긴 변 최대 2048px, 품질 0.82의 JPEG로 렌더링해 백업 제외 캐시 `ikkyee-derivatives`에만 저장한다. 파생본은 최대 60분이며 앱 시작 시 만료 파일, 권한 상실 시 전체 파일, 배치 실패 시 해당 배치에서 이미 만든 파일을 정리한다. 원본 수정과 업로드·게시 작업 생성은 하지 않는다.
- [x] 승인된 개인정보 정책에 따라 메타데이터를 제거하거나 제한한다. 근거: `mobile/src/publication-jpeg-sanitizer.ts`, `mobile/src/publication-derivative.ts`, `mobile/src/publication-derivative-runtime.ts`, `mobile/app/publish/review.tsx`, 관련 테스트 (2026-08-24). 렌더링한 JPEG의 APP0~APP15와 COM 구간을 바이트 단위로 제거해 EXIF·GPS·XMP·ICC·IPTC·댓글 및 부가 썸네일을 배제하고, 구조 구간·스캔 데이터·종료 마커만 남긴 뒤 동일 파서로 메타데이터 부재를 재검증한다. 잘리거나 잘못된 JPEG는 파생본으로 인정하지 않으며 업로드는 아직 시작하지 않는다.
- [ ] 명시적 확인 뒤에만 업로드하고 재시도 가능한 게시 작업을 저장한다. 비공개·공개·링크 목적 모두 최종 `지금 업로드` 확인 뒤 `photos` 버킷의 소유자 경로에 `ArrayBuffer`, `upsert: false`로 전송하고 사진 행을 만든다. 링크 사진은 기존 웹 `visibility = 'link'`와 분리해 `private`, `shared = false`로 저장하고, 원문 256-bit 토큰은 백업 제외 SQLite 작업에만 보관하며 서버에는 SHA-256 해시만 저장한다. 실패 작업의 수동 재시도, 최대 3회 제한, Storage 보상 삭제, 임시 파생본 정리도 연결했다. 빈 로컬 DB에서 익명·비소유자 차단, 소유자 접근, 잘못된 토큰 404, 정상 토큰의 5분 서명 URL 전체 왕복을 검증했다. 운영 마이그레이션·Edge Function 배포와 실제 원격 RLS·Storage 검증이 남아 있어 미완료다. 근거: `supabase/migrations/20260824113903_secure_mobile_photo_links.sql`, `supabase/functions/photo-link/index.ts`, `mobile/src/publication-publisher.ts`, `mobile/src/publication-retry.ts`, `mobile/src/publication-job-repository.ts`, `mobile/src/publication-runtime.ts`, `mobile/scripts/verify-mobile-link-policy.mjs`, 관련 테스트 (2026-08-24).
- [x] 취소, 백그라운드 중단, 중복 제출, 부분 실패를 안전하게 처리한다. 근거: `mobile/app/publish/review.tsx`, `mobile/src/publication-operation-lock.ts`, `mobile/src/publication-job-repository.ts`, `mobile/src/local-photo-indexing-runtime.ts`, `mobile/src/publication-runtime.ts`, `mobile/src/publication-publisher.ts`, 관련 테스트 (2026-08-24). 게시 준비 취소나 뒤로 가기는 생성된 모든 임시 파생본을 지운 뒤 화면을 닫고, 업로드가 시작되면 뒤로 가기를 잠가 완료·실패 기록 전에 흐름이 사라지지 않게 한다. 프로세스 메모리 잠금과 SQLite 미완료 작업 조회를 함께 사용해 같은 소유자 사진의 겹치는 제출을 전송 전에 거부한다. 앱 프로세스 최초 로컬 DB 접근에서 이전 `running` 작업만 실패·재시도 가능 상태로 복구해 현재 프로세스의 정상 업로드와 충돌하지 않는다. 여러 장 배치는 한 장의 네트워크 실패 뒤에도 다음 장을 계속 처리하고 성공·실패 수와 각 작업 ID를 반환한다.
- [x] 게시 취소, 삭제, 앱 재설치, 기기 원본 삭제 동작을 검증한다. 게시 준비 취소 시 임시 파생본 정리, 두 번 확인하는 소유자 클라우드 게시물 삭제, 원격 정리 실패 시 로컬 재시도 상태 보존, 빈 재설치 DB의 기기 사진 재인덱싱, OS 원본 삭제 뒤 로컬 tombstone·썸네일 정리를 구현하고 자동 테스트로 검증했다. 기기 원본 바이트는 어느 경로에서도 삭제하지 않는다. 빈 로컬 Supabase 전체 migration 재생 뒤 실제 publishable-key 소유자·비소유자 클라이언트로 DB 행과 Storage 객체 삭제 허용·거부 및 객체 생존 여부까지 왕복 검증했다. 근거: `mobile/src/publication-deletion.ts`, `mobile/src/publication-runtime.ts`, `mobile/app/device-photo/[assetId].tsx`, `mobile/__tests__/publication-deletion.test.ts`, `mobile/__tests__/local-photo-reinstall-integration.test.ts`, `mobile/__tests__/publication-review-screen.test.tsx`, `mobile/scripts/verify-photo-storage-access.mjs`, `test/mobile-security-privacy-review.test.mjs` (2026-08-26).
- [x] 모바일 코드가 앨범을 생성·조회·수정·삭제하지 않는지 확인한다. 근거: `mobile/__tests__/mobile-album-boundary.test.ts`, `mobile/src/backend-policy-contract.json`, `docs/mobile/product-definition.md` (2026-08-25). `mobile/app`/`mobile/src`의 TypeScript·TSX·MJS 전체에서 `albums`·`album_photos` Supabase 테이블 조회·SQL 생성/수정/삭제·앨범 RPC·앨범 라우트를 금지하는 소스 계약 테스트를 추가했다. 백엔드 계약의 모바일 repository 목록에도 앨범이 없고 `albums`·`album_photos`는 웹 전용으로 유지된다. 계정 삭제 경고와 서버 정리에서 기존 웹 앨범을 언급·제거하는 것은 새 모바일 앨범 기능이 아니므로 유지한다.

## 8. 좋아요·댓글·공유·안전·프로필

- [x] 좋아요 사진 불러오기, 낙관적 좋아요·취소, 실패 되돌리기, 빈 상태를 구현한다. 근거: `mobile/src/liked-photo-repository.ts`, `mobile/app/(tabs)/likes.tsx`, `mobile/app/explore-photo/[photoId].tsx`, `mobile/scripts/verify-like-policy.mjs`, 관련 테스트 (2026-08-24). 로그인 사용자의 `user_likes`를 읽고 현재도 `visibility = 'public'`인 사진만 5분 서명 URL로 표시한다. 공개 사진 상세의 좋아요·취소와 목록의 취소는 즉시 반영한 뒤 `set_photo_like` 원자적 RPC 결과로 확정하며 실패하면 이전 수·선택·목록 위치를 복원한다. 로컬 Supabase에서 authenticated 좋아요·취소, 비소유 비공개 사진 거부, 비공개 전환 목록 제외, anon RPC 실행 거부를 트랜잭션 롤백으로 검증했다.
- [x] 로딩, 작성 실패, 삭제, 악용 방지 제한이 포함된 댓글을 구현한다. 근거: `mobile/src/photo-comment-repository.ts`, `mobile/app/explore-photo/[photoId].tsx`, `supabase/migrations/20260824121636_secure_mobile_comments.sql`, `mobile/scripts/verify-comment-policy.mjs`, 관련 테스트 (2026-08-24). 공개 사진의 댓글을 작성 시각순 최대 100개로 조회하고 프로필 닉네임만 결합한다. 로그인 사용자는 공백 제거 후 1~1,000자 댓글을 작성할 수 있으며 본인 댓글에만 삭제 동작을 표시한다. 작성·삭제 실패는 백엔드 상세를 숨기고 삭제 실패 시 낙관적으로 제거한 댓글을 복원한다. 데이터베이스는 소유자 삭제 RLS, 고정 `search_path`의 `security invoker` 트리거, 서버 기준 작성 시각, 60초당 5개 제한, 함수 직접 실행 거부를 적용했으며 빈 로컬 Supabase에서 입력 정규화·시간 역조작 제한·비소유 삭제 거부·비공개 전환 숨김을 트랜잭션으로 검증했다.
- [ ] 네이티브 링크 공유와 수신 링크의 올바른 공개 화면 재진입을 구현한다. 운영 시스템 공유를 `https://practice-week1-cws.pages.dev/photo-link#<token>`으로 전환해 원문 토큰이 HTTP 요청·Cloudflare 접근 URL·referrer에 포함되지 않게 했다. 앱은 정확한 origin·path·fragment만 허용해 `/photo-link`에서 기존 안전한 Edge Function 화면으로 연결하고, development만 `ikkyee://photo-link/<token>`을 사용한다. 앱 미설치 화면은 외부 요청 없이 fragment를 검증하고 custom scheme을 만든 뒤 주소에서 fragment를 제거한다. 공격자 origin 거부, 네이티브 설정, AASA·`assetlinks.json`, no-store·no-referrer·CSP 대체 화면을 자동·로컬 런타임으로 검증했다. Apple Team ID·Android 출시 서명 SHA-256 등록, 배포, 설치·미설치 서명 실기기 재진입은 외부 관문으로 남아 미완료다. 근거: `mobile/src/publication-link-token.ts`, `mobile/app/photo-link/index.tsx`, `mobile/app/photo-link/[token].tsx`, `mobile/app/publish/review.tsx`, `functions/photo-link/index.js`, `public/mobile-photo-link-fallback.js`, `docs/mobile/universal-links.md`, 관련 테스트 (2026-08-26).
- [x] 운영자 대응 절차가 있는 신고·차단 흐름을 구현한다. 근거: `mobile/src/content-safety-repository.ts`, `mobile/src/PhotoSafetyControls.tsx`, `mobile/src/BlockedUsersSection.tsx`, `mobile/app/explore-photo/[photoId].tsx`, `mobile/app/profile.tsx`, `supabase/migrations/20260824122712_add_mobile_content_safety.sql`, `mobile/scripts/verify-content-safety-policy.mjs`, `docs/mobile/content-safety-operations.md`, 관련 테스트 (2026-08-24). 로그인한 비소유자는 공개 사진을 5개 사유와 선택 설명으로 신고하고 명시적 확인 뒤 작성자를 차단할 수 있다. 차단하면 해당 사용자 프로필·사진·댓글이 그 사용자에게만 RLS에서 숨겨지며 프로필 설정의 서버 스냅샷 목록에서 해제할 수 있다. 신고자는 본인 신고의 상태만 읽고 작성만 가능하며 수정·삭제, 타인 신고 조회, 트리거 직접 실행은 차단한다. 신고 시각·상태는 서버가 확정하고 대기 중 중복과 24시간당 10개 초과를 거부한다. 로컬 Supabase에서 익명 공개 범위 유지, 신고 격리·정규화·도배 제한, 사용자별 차단·해제와 클라이언트 최소 grant를 검증했다. 운영 문서는 긴급 1시간·높음 24시간·일반 72시간의 최초 대응, 증거 보존, 이의 제기, 롤백을 정의한다. 실제 운영 책임자·지원 채널·비공개 기록 시스템 지정은 별도 출시 관문으로 유지한다.
- [x] 로그인 프로필, 설정, 로그아웃, 공개 사진 요약을 구현한다. 근거: `mobile/app/profile.tsx`, `mobile/src/ProfileEditor.tsx`, `mobile/src/ProfilePublicSummary.tsx`, `mobile/src/BlockedUsersSection.tsx`, `mobile/__tests__/profile-public-summary.test.tsx` (2026-08-25). 로그인 사용자는 같은 스크롤 화면에서 프로필 편집, 최근 공개 사진 최대 6장과 조회된 최근 공개 사진 수, 계정 이메일, 로그아웃, 차단 목록 설정을 확인한다. 공개 사진은 기존 공개 프로필 저장소가 `visibility = 'public'` 행만 조회해 5분 서명하고 사진 상세로 이동하며 로딩·빈 상태·원시 오류를 숨긴 재시도를 제공한다.
- [x] 계정 삭제 요청·확인과 백엔드 정리 의무를 검증한다. 근거: `mobile/src/AccountDeletionSection.tsx`, `mobile/src/account-local-cleanup.ts`, `mobile/src/account-deletion-client.ts`, `supabase/functions/delete-account/index.ts`, `mobile/scripts/verify-account-deletion.mjs`, `docs/mobile/account-deletion-operations.md`, 관련 테스트 (2026-08-25). 명시적 2단계 경고와 정확한 `계정 삭제` 입력을 요구한다. 원본 기기 사진은 유지하며 백업 제외 SQLite·썸네일·게시 파생본을 먼저 지우고, 서버는 검증된 access token의 소유자 경로 Storage, 연결 DB 행, Auth 사용자 순으로 멱등 정리한다. 로컬 전체 왕복에서 미인증·오확인 거부, 대상 Auth·DB·Storage 제거, 다른 사용자 데이터 보존을 검증했다.
- [x] 삭제·비공개 콘텐츠를 좋아요, 댓글, 링크, 캐시 화면에서 제거하거나 숨긴다. 근거: `mobile/src/content-visibility-refresh.ts`, Explore·좋아요·공개 사진 상세·공개 프로필·링크 화면, `mobile/scripts/verify-like-policy.mjs`, `mobile/scripts/verify-comment-policy.mjs`, `mobile/scripts/verify-mobile-link-policy.mjs`, `docs/mobile/content-visibility-cache.md`, 관련 테스트 (2026-08-25). 각 화면은 재 focus·foreground 시 공유 Supabase의 현재 공개 범위를 재조회하고 기존 서명 URL·미리보기·댓글을 먼저 제거한다. 삭제·비공개 사진은 Explore, 좋아요, 상세·댓글, 공개 프로필·내 프로필 요약에서 제거되며 해제된 링크는 잘못된 링크와 같은 404를 받는다. 이미 발급된 300초 서명 URL의 독립 만료·CDN 한계는 운영 문서에 기록했다.

## 9. 품질·보안·운영

- [ ] CI에서 `mobile/`의 `npm run lint`, `npm run typecheck`, `npm test`, `npm run schema:verify`를 모두 통과시킨다. Node.js 22, 읽기 전용 저장소 권한, 잠금 파일 설치, 중복 실행 취소가 적용된 GitHub Actions workflow와 소스 계약 테스트를 추가했고 네 명령은 로컬에서 모두 통과했다. 근거: `.github/workflows/mobile-ci.yml`, `test/mobile-prelaunch-checklist.test.mjs` (2026-08-25). 실제 `dev` push 또는 pull request에서 원격 workflow가 성공해야 완료로 전환한다.
- [x] 인증, 미디어 권한, 로컬 스캔, 게시, Explore, 좋아요, 삭제 통합 테스트를 추가한다. 근거: `mobile/__tests__/release-journey-integration.test.ts` (2026-08-25). 검증된 세션 부트스트랩에서 시작해 전체 사진 권한 해석, 페이지 기반 기기 사진 인덱싱, 선택 라우트 왕복, private Storage 소유자 경로 게시 작업, 공개 Explore 서명 조회, 원자적 좋아요와 좋아요 목록, 계정 로컬 SQLite·파생본 정리를 인메모리 경계 구현으로 한 흐름에서 검증한다. 원본 기기 사진은 삭제하지 않으며 실제 RLS·Storage 역할 검증은 별도의 로컬 Supabase 전체 왕복 테스트가 담당한다.
- [ ] iOS·Android 빌드 산출물에서 Maestro 기본 동작 테스트를 실행한다. 누락돼 항상 실패하던 `mobile/maestro/explore-smoke.yaml`을 추가하고 `com.ikkyee.mobile` standalone 빌드에서 계정·비밀값 없이 초기화, 런타임 권한 거부, Explore 빈 검색 검증, 내 사진 권한 안내, 좋아요·프로필 핵심 이동을 접근성 ID로 실행하도록 고정했다. `clearKeychain`은 사용하지 않으며 Expo Go 결과를 독립 빌드 근거로 인정하지 않는다. 근거: `mobile/maestro/explore-smoke.yaml`, `mobile/scripts/run-maestro.mjs`, `test/mobile-maestro-contract.test.mjs`, `docs/mobile/maestro-release-smoke.md` (2026-08-26). 현재 환경에는 Maestro CLI·실행 중인 대상 기기와 설치된 iOS·Android standalone 빌드가 없어 실제 양 플랫폼 실행은 외부 빌드 관문으로 남아 미완료다.
- [x] 비밀값, 개인 테스트 데이터, 정확한 위치 예시, 비공개 사진이 커밋되거나 로그에 남지 않았는지 확인한다. 근거: `mobile/scripts/audit-release-artifacts.mjs`, `test/mobile-release-artifact-audit.test.mjs`, `mobile/package.json`, `.github/workflows/mobile-ci.yml` (2026-08-25). Git이 추적하거나 추적 예정인 `mobile`·`.github`·`supabase` 출시 범위에서 실제 secret/JWT/API key/인증정보 포함 DB URL/개인키 형식, 비예시 이메일, 앱 소스의 정밀 좌표 상수·민감 로깅, 환경·로그·서명 파일과 승인되지 않은 사진 자산을 검사한다. 일치 내용은 출력하지 않고 코드와 경로만 보고하며 현재 216개 파일·213개 텍스트에서 발견 0건으로 통과했다. CI에서 매 실행 재검사한다.
- [ ] 공급자 승인 뒤 개인정보를 보호하는 오류 보고와 출시 진단을 추가한다.
- [x] API, 지도, Storage, 이미지 트래픽, 활성 사용자 비용 경보를 정의한다. 근거: `docs/mobile/cost-alerts.md`, `test/mobile-cost-alerts.test.mjs`, `docs/operations/usage-cost-thresholds.md` (2026-08-25). API 요청, Maps SDK, Storage 용량, 이미지 egress, Edge Function, MAU에 현재 플랜 대비 70% 경고·90% 조치와 최근 기준선 2배 이상치 조건을 적용했다. 사용자별 원시 로그 없이 집계값만 사용하고 중복 요청·파생본·지도 호출부터 줄이며 비용 때문에 공개 범위·RLS·원본 사진을 훼손하지 않는다. 실제 Supabase·Google Cloud 예산과 담당자·지원 채널·테스트 알림은 외부 설정으로 분리했다.
- [x] 모바일 장애 분류, 되돌리기, 강제 업그레이드, 백엔드 호환 절차를 문서화한다. 근거: `docs/mobile/incident-compatibility-runbook.md`, `test/mobile-incident-compatibility-runbook.test.mjs` (2026-08-25). P0~P3 분류와 차단·진단·종료 근거, 현재 OTA 미구성 상태의 스토어 바이너리 복구, RLS·Storage·Edge Function·로컬 SQLite별 안전한 순방향 복구를 정의했다. 웹과 N/N-1 모바일을 위한 확장→이행→관찰→축소 순서를 적용하고 DB 하향, RLS 해제, private bucket 공개, 원본 기기 사진 삭제를 금지했다. 강제 업그레이드는 현재 미구현으로 명시하고 보안·데이터 손상 등 명시적 비상시에만 승인된 외부 최소 버전 설정으로 사용하되 로컬 사진의 오프라인 접근을 유지한다.
- [ ] 앱 시작, 메모리, 저장공간, 네트워크, 이미지, 배터리 예산을 검증한다. 근거: `mobile/performance-budget.json`, `mobile/scripts/audit-performance-budget.mjs`, `test/mobile-performance-budget.test.mjs`, `.github/workflows/mobile-ci.yml`, `docs/mobile/performance-budget.md` (2026-08-25). CI와 로컬에서 production iOS·Android·Web export 크기, 최대 자산, 전체 산출물 크기와 썸네일·파생본·페이지네이션·서명 URL 갱신 상한을 자동 검사한다. 현재 iOS 3,651,791 bytes, Android 3,956,149 bytes, Web 1,663,327 bytes, 최대 자산 962,968 bytes, 전체 10,815,138 bytes로 모두 예산 안이다. Preview 서명 빌드의 지원 iPhone 1대·등급이 다른 Android 2대에서 cold/warm start, 지속 FPS, 10,000장 인덱싱 메모리, 저장공간, 제한 네트워크와 10분 배터리 수치를 아직 수집하지 않았으므로 미완료로 유지한다.
- [ ] 지원 iPhone 1대와 서로 다른 등급의 Android 2대 이상에서 실기기 QA를 완료한다.
- [x] 인증 리디렉션, 로컬 데이터, 로그, 링크, RLS, Storage 보안·개인정보 검토를 완료한다. callback을 정확한 `ikkyee://auth/callback` scheme·host·path에서만 코드·토큰 소비 전에 처리하고 공급자 오류 원문을 숨기며 OAuth authorization URL은 HTTPS와 개발 loopback만 허용하도록 보강했다. 네이티브 SecureStore·백업 제외 로컬 경로, 운영 소스 무로그, fragment 공유 토큰·서버 해시, 공개 7개 테이블 RLS, `SECURITY DEFINER` 실행 회수, private photos·소유자 avatars Storage 경계를 `npm run security:verify`와 CI에서 검사한다. 빈 로컬 Supabase 전체 재생 뒤 익명·소유자·비소유자 역할로 댓글·좋아요·신고·차단·프로필·사진·아바타·링크·계정 삭제를 왕복했고 DB lint·security advisor 발견 0건을 확인했다. 검토 과정에서 링크 fixture가 영구 photos 버킷을 삭제하던 cleanup과 최신 Storage API의 0행 DELETE 성공 응답을 오판하던 테스트를 수정했다. 근거: `mobile/src/auth-callback.ts`, `mobile/src/oauth-auth.ts`, `mobile/scripts/audit-security-privacy.mjs`, `mobile/scripts/verify-mobile-link-policy.mjs`, `mobile/scripts/verify-photo-storage-access.mjs`, `docs/mobile/security-privacy-review.md`, `test/mobile-security-privacy-review.test.mjs` (2026-08-26). 운영 원격 migration 적용·재검증, Auth JWT·유출 비밀번호·redirect 설정과 서명 실기기 확인은 각각 별도 출시 관문에 유지한다.
- [x] Expo 57을 53으로 내리는 강제 해결을 적용하지 않고 Expo·Metro 운영 의존성 경고를 해결하거나 공식 평가한다. 근거: `mobile/package.json`, `mobile/package-lock.json`, `mobile/app.json`, `mobile/.gitignore`, `.github/workflows/mobile-ci.yml`, `test/mobile-prelaunch-checklist.test.mjs` (2026-08-25). `expo-doctor` 1.20.3을 고정하고 `expo install --check`와 함께 로컬·CI 품질 관문으로 추가했다. SDK 57에서 항상 활성화되는 신 아키텍처의 불필요한 `newArchEnabled` 설정을 제거하고, 루트 생성 폴더만 제외하도록 `/ios/`·`/android/` 패턴을 좁혀 로컬 Expo 모듈 네이티브 소스를 보존했다. 공식 검사 21/21과 의존성 호환 검사가 통과했으며 SDK 하향은 적용하지 않았다.

## 10. 스토어 및 출시

- [ ] 앱 이름, 아이콘, 적응형 아이콘, 시작 화면, 스크린샷, 스토어 설명을 확정한다. `Ikkyee` 이름과 1024px 불투명 스토어 아이콘, 투명 Android 적응형·테마 전경, `#F9F7F2` 배경의 네이티브 시작 화면을 Expo 구성에 연결했다. 근거: `mobile/app.json`, `mobile/assets/`, `mobile/__tests__/app-assets-contract.test.ts`, `docs/mobile/app-assets.md` (2026-08-26). 실기기 release 마스크·시작 화면 승인과 스크린샷·스토어 설명이 남아 미완료로 유지한다.
- [ ] 작동하는 개인정보 처리방침, 지원, 계정 삭제 URL을 게시한다.
- [ ] Apple 개인정보 표시와 Google Play 데이터 보안 선언을 완료한다. 현재 앱·SDK 데이터 흐름을 `mobile/store-privacy-contract.json` 한 곳에 고정하고 Expo iOS 개인정보 매니페스트와 연결했다. 설치된 13개 SDK `PrivacyInfo.xcprivacy` 대비 수집 유형·필수 사유 API 누락을 `npm run privacy:verify`와 CI에서 검사하며, 임시 production iOS prebuild의 병합 매니페스트(추적 false, 추적 도메인 0개, 수집 유형 12개, 필수 사유 API 4개)를 확인했다. Google Play 수집·선택 여부·목적 및 Maps/Places 처리자 경계를 문서화했다. 근거: `mobile/store-privacy-contract.json`, `mobile/app.config.js`, `mobile/scripts/verify-store-privacy.mjs`, `docs/mobile/store-privacy-disclosures.md`, `test/mobile-store-privacy-contract.test.mjs` (2026-08-26). App Store Connect·Google Play Console 입력, 제출 archive Privacy Report 대조, 공급자 계약 및 운영자·법률 승인이 남아 미완료로 유지한다.
- [ ] 콘텐츠·연령 등급, 수출 규정, 필수 테스트 계정·정보 공개를 완료한다.
- [ ] 서명 자격 증명, 빌드 번호, 의미 기반 버전, 출시 채널을 구성한다.
- [ ] TestFlight와 Play 내부 테스트에서 설치, 업그레이드, 딥링크, 로그인 QA를 통과한다.
- [ ] 출시 후보를 동결하고 소스 커밋, 백엔드 스키마 호환성, 되돌리기 지점을 기록한다.
- [ ] 운영 출시의 명시적 승인을 받는다.
- [ ] iOS·Android 빌드를 제출하고 심사 지적 사항을 해결한다.
- [ ] 출시 후 기본 동작을 확인하고 오류, 인증, 지도, Storage, 비용 감시를 시작한다.

## 영역별 진행 요약

| 영역 | 완료한 것 | 남은 다음 관문 |
| --- | --- | --- |
| 제품 범위 | 웹과 같은 랜딩, 계정 메뉴·Explore 진입, 앨범 없는 모바일 범위 | 실기기 디자인 승인과 출시 책임 결정 |
| 화면 이동 | Explore 장소 검색·공개 사진 범위·현재 viewport 조회·미리보기·상세·작성자 프로필, 댓글·신고·차단, 내 사진, 기기 사진 상세·위치 편집, 게시 선택 검토, 링크 수신, 좋아요, 프로필 편집·공개 요약·차단 해제·계정 삭제, 로그인, 인증 콜백, 비밀번호 변경 | 운영 지도·Places 키의 서명 빌드 검증 |
| 로컬 사진 기반 | 모델, SQLite 스키마, 마이그레이션, 복구 검증, OS 권한 상태, 허용 사진 미리보기, 증분 스캔·체크포인트·tombstone 대조, 백업 제외 네이티브 저장소와 화면 인덱싱·최신순 격자·비공개 위치 지도·상세·수동 위치 보정·게시용 선택·메타데이터 제거 임시 파생 이미지, 비공개·공개·토큰형 링크 업로드와 재시도 작업 저장 기반, 게시 취소·중복 방지·중단 복구·부분 실패 처리, 용량 제한 썸네일, EXIF·위치·Live Photo 보강 | 운영 링크 정책 배포, 네이티브 개발 빌드, 대용량 실기기 QA |
| Supabase | 안전한 세션, 이메일 인증·복구, Google·Kakao OAuth 클라이언트 | 공급자 콘솔, 계정 연결, 실기기 리디렉션, RLS 재검증 |
| 로컬 Supabase | Docker Desktop, 빈 DB 기준 마이그레이션 재생, 모바일 링크·계정 삭제 Edge Function 전체 왕복, 좋아요·댓글·신고·차단 역할 정책 검증 | 원격 migration history 정합성 확인과 운영 배포 |
| 출시 검증 | Expo Doctor·의존성 호환 검사, 타입 검사, 린트, 전체 테스트, 스키마 검증, 3개 플랫폼 내보내기, 운영 정책 정제 증빙 복구, GitHub Actions workflow | 원격 CI 실행, 서명 빌드, 스토어, 실기기 |

## 검증 기록

### 2026-08-21

- 웹 테스트 489개 통과, 성능 예산 통과.
- 모바일 타입 검사, 린트, 로컬 스키마의 신규·업그레이드·손상·잘못된 마이그레이션 검증 통과.
- iOS·Android·웹 번들 내보내기 통과.
- 당시 모바일 테스트 45개 통과, 2개 실패. 실패 원인은 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 비공개 검증 파일 누락이다.
- Docker Desktop 4.87.0과 Docker Engine 29.7.2를 설치·실행했다.
- 로컬 Supabase 시작은 `photo_private_locations` 기준 테이블 누락으로 중단했으며 원격 Supabase는 변경하지 않았다.
- Expo Router의 Explore·내 사진·좋아요·프로필·로그인 화면과 Supabase 세션 기반을 추가했다.
- 운영 의존성 감사 경고의 강제 해결은 Expo 57을 53으로 내리므로 적용하지 않았다.

### 2026-08-24

- 이메일 로그인·가입·비밀번호 재설정 요청과 앱 루트 세션 복원·검증·갱신·현재 기기 로그아웃을 구현했다.
- PKCE 코드와 네이티브 토큰을 처리하는 `/auth/callback`, `/auth/update-password`를 구현했다.
- Google·Kakao OAuth를 시스템 인증 브라우저와 기존 콜백 교환에 연결했다.
- OAuth 설정 및 실기기 검증 절차를 `docs/mobile/oauth-redirect-setup.md`에 기록했다.
- OAuth 집중 테스트 11개 통과. 전체 모바일 테스트 72개 통과, 기존 비공개 백엔드 자료 누락으로 2개 실패.
- 타입 검사, 린트, SQLite 복구 검증, Expo 의존성 호환성, iOS·Android·웹 내보내기 통과.
- 공급자 콘솔 상태와 실제 iOS·Android 리디렉션은 로컬에서 확인할 수 없어 운영 OAuth 항목은 미완료로 유지했다.
- `내 사진`에 실제 OS 사진 권한 요청과 전체·제한·거부·회수·설정 이동·제한 사진 관리 상태를 구현했다. 허용 상태에서는 원본을 복사하거나 업로드하지 않고 최신 이미지 최대 60개의 읽기 전용 미리보기를 표시한다.
- 기기 사진 권한 집중 테스트 11개와 증분 스캔·SQLite 저장소 테스트 5개, 타입 검사, 린트가 통과했다. 전체 모바일 테스트는 86개 통과, 기존 비공개 백엔드 증빙 누락으로 2개 실패했다. 백업 제외 네이티브 디렉터리 연결, 화면 수명 주기 실행, 실기기 권한 검증은 별도 미완료 항목으로 유지했다.
- Android `noBackupFilesDir`와 iOS Application Support의 `isExcludedFromBackup` 검증을 사용하는 로컬 Expo 모듈을 추가했다. 네이티브 관찰값은 기존 경로·앱 식별자 정책을 통과한 경우에만 SQLite에 전달된다.
- `내 사진` 권한 허용 흐름에서 증분 인덱서를 실행하고 성공·이어하기·비차단 실패 상태를 표시한다. 집중 테스트 10개, 타입 검사, 린트, Android·Apple Expo 자동 연결 검색이 통과했다. 네이티브 개발 빌드와 실기기 저장 경로 검증은 아직 완료하지 않았다.
- `expo-image-manipulator`와 `expo-crypto`를 사용해 최대 변 512px JPEG 썸네일을 SHA-256 키로 생성하고, 512MiB 쓰기 전 LRU 제거·OS 원본 삭제 tombstone 정리·권한 상실 전체 정리를 구현했다.
- EXIF 촬영 시각·정확 위치·Live Photo subtype을 최근 미처리 자산부터 회당 60개씩 보강한다. GPS는 별도 SQLite 열에만 저장하며 잘못된 좌표, 과대·중첩 EXIF, 네이티브 오류 상세는 저장하지 않는다. 관련 집중 테스트 19개, 타입 검사, 린트, 스키마 검증, 3개 플랫폼 내보내기와 의존성 검사가 통과했다. 전체 모바일 테스트는 105개 통과, 기존 비공개 백엔드 증빙 누락으로 2개 실패했다. 실기기 HEIC·iCloud·Android 원본 위치 검증은 미완료다.
- `내 사진`의 최종 격자 데이터 원본을 MediaLibrary 미리보기에서 백업 제외 SQLite 조회 결과로 전환했다. 인덱싱·캐시 정리·메타데이터 보강·최신 60개 조회를 한 DB 연결에서 처리하며, 성공 결과에만 DB 목록을 반영하고 실패하면 기존 미리보기를 유지한다. 관련 집중 테스트 10개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 107개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- SQLite에서 위치가 있는 최신 기기 사진을 최대 500개까지 별도 조회해 `내 사진`의 목록/지도 전환에 연결했다. 비공개 로컬 지도는 원시 좌표를 문구로 노출하거나 외부 지도 서버로 보내지 않고 상대 좌표로 투영하며 위치 없음과 선택 상태를 제공한다. 관련 집중 테스트 12개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 109개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했다.
- 격자와 비공개 지도 마커에서 `/device-photo/[assetId]` 상세 화면을 열도록 연결했다. 상세 저장소는 기기 원본의 형식·해상도·촬영 시각·비공개 위치 존재 여부와 가장 최근 게시 작업 상태를 함께 조회하며, 화면은 기기 저장과 클라우드 게시 상태를 별도 카드로 표시한다. 관련 집중 테스트 15개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 112개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했다.
- SQLite 조회 완료 뒤 위치가 없는 사진에 배지를 표시하고 상세의 위치 추가·수정에서 `/device-photo/[assetId]/location`으로 이동하도록 연결했다. 전 세계 범위의 외부 요청 없는 로컬 지도 탭을 좌표로 변환해 검증한 뒤 백업 제외 SQLite에 저장하며, 정확한 좌표는 사용자 문구에 표시하지 않는다. 관련 집중 테스트 16개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 117개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했다.
- `내 사진` 격자에 최대 20장의 명시적 선택 모드를 추가하고 비공개 저장·링크 공유·공개 게시 중 목적을 선택해 `/publish/review`에서 다시 확인하도록 연결했다. 자산 식별자는 검토 화면에 표시하지 않으며 이 단계에서는 업로드, 게시 작업, 외부 요청을 만들지 않는다. 관련 집중 테스트 10개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 121개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- 게시 검토의 명시적 확정 뒤 Expo ImageManipulator로 긴 변 최대 2048px·품질 0.82 JPEG 파생본을 캐시 전용 `ikkyee-derivatives`에 생성한다. 원본은 읽기만 하고, 파생본은 60분 만료·앱 시작 만료 정리·권한 상실 전체 정리·배치 실패 롤백을 적용하며 업로드나 게시 작업은 만들지 않는다. 관련 집중 테스트 11개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 127개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- 렌더링한 게시용 JPEG에서 APP0~APP15·COM 구간과 종료 마커 뒤 데이터를 제거해 EXIF·GPS·XMP·ICC·IPTC·댓글·부가 썸네일이 남지 않게 했다. 점진 JPEG의 스캔 사이 메타데이터도 제거하고, 메타데이터 부재와 정상 SOI·SOS·EOI 구조를 재검증한 결과만 `metadataPolicy: stripped` 파생본으로 인정한다. 관련 집중 테스트 10개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 3개 플랫폼 내보내기가 통과했다. 전체 모바일 테스트는 130개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- 게시 검토 화면에 파생본 준비와 분리된 `지금 업로드` 확인을 추가하고, 비공개·공개 목적의 소유자 경로 Storage 업로드와 `photos` 행 생성을 연결했다. 업로드 전에 백업 제외 SQLite 작업을 저장하며 실패 작업은 1분·5분 재시도 시각과 최대 3회 제한을 가진다. DB 기록 실패 뒤 Storage 객체 보상 삭제와 모든 결과의 파생본 정리를 적용했다. 현재 링크 공개 RLS는 토큰 경계를 보장하지 않아 링크 목적은 작업 저장·네트워크 전송 전에 차단하며, 토큰 정책과 실제 재시도 실행기 및 원격 검증이 남아 체크 항목은 미완료로 유지했다. 관련 집중 테스트 6개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 iOS·Android·웹 내보내기가 통과했다. 전체 모바일 테스트는 134개 통과, 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- 사진 상세에서 실패한 게시를 사용자가 직접 다시 시도하도록 연결했다. 재시도는 기기 원본을 다시 읽어 메타데이터가 제거된 임시 파생본을 새로 만들고 기존 작업 ID·소유자 Storage 경로를 재사용한다. 원본 권한·가용성 실패는 시도 횟수를 소모하지 않으며, 경로 소유자 불일치와 최대 3회 초과 작업은 네트워크 전송 전에 거부한다. 관련 집중 테스트 10개, 타입 검사, 린트, 스키마 검증과 Expo 의존성 검사가 통과했다. 전체 모바일 테스트는 138개 통과, 기존 비공개 백엔드 증빙 누락으로만 2개 실패했다.
- 준비 완료 뒤 `게시 취소`나 뒤로 가기를 누르면 임시 파생본을 모두 지우고, 업로드 도중에는 화면 이탈을 잠그도록 했다. 같은 소유자 사진은 프로세스 잠금과 SQLite 미완료 작업 사전 조회로 중복 제출을 차단한다. 앱 프로세스 최초 DB 접근은 이전 실행에서 남은 `running` 작업을 재시도 가능한 실패로 복구하며 이후 정상 업로드는 건드리지 않는다. 여러 장 배치는 한 장 실패 뒤에도 다음 장을 계속 처리하고 부분 성공 수를 반환한다. 관련 집중 테스트 17개, 타입 검사, 린트, 스키마 검증, Expo 의존성 검사와 iOS·Android·웹 내보내기가 통과했다. 전체 모바일 테스트는 142개 통과, 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했으며 웹 테스트 506개와 빌드도 통과했다.
- `supabase/schema.sql`을 최초 기준 마이그레이션으로 고정하고 이후 증분 마이그레이션을 빈 로컬 Supabase에서 순서대로 재생했다. 모바일 링크는 원문 256-bit 토큰을 백업 제외 SQLite에만 두고 DB에는 SHA-256 해시만 저장하며, 기존 웹 링크 행과 분리된 비공개 행을 `photo-link` Edge Function이 5분 서명 URL로 제공한다. 익명·비소유자 직접 읽기 차단, 소유자 읽기, 잘못된 토큰 404, 정상 토큰 서명 응답과 민감 필드 미노출을 로컬 전체 왕복으로 검증했다. 앱은 게시 성공 후 HTTPS fragment 시스템 공유와 `/photo-link` 수신 화면을 제공하며 development custom scheme의 `/photo-link/[token]`을 대체 경로로 유지한다. 운영 Supabase 배포와 서명 실기기 유니버설 링크·앱 링크 검증은 미완료로 유지했다.
- Explore의 고정 예시 사진 3개를 제거하고 초기 서울 범위의 공개 사진만 최신순·20개 단위로 조회하도록 했다. 각 페이지는 private `photos` 버킷의 5분 서명 URL을 만들며, 화면 이탈·재조회 시 이전 요청 취소, 중복 제거, 빈 상태, 안전한 오류·재시도와 더 보기를 제공한다. 실제 지도 SDK viewport가 아직 없어 현재 지도 영역 연결 항목은 미완료로 유지했다.
- Explore 하단 미리보기에서 `/explore-photo/[photoId]`로 이동해 공개 사진을 ID로 다시 조회하고 5분 서명 이미지, 설명, 날짜, 좋아요 수와 공개 위치 정밀도만 표시한다. 작성자 행은 `/public-profile/[userId]`로 이동하며 공개 프로필 필드와 해당 작성자의 공개 사진 최신 12장만 보여준다. 두 화면 모두 요청 취소·안전한 재시도 상태를 제공하고 좌표·Storage 경로·원시 백엔드 오류·식별자를 사용자 문구에 노출하지 않는다.
- 로그인 사용자의 좋아요 탭에서 최대 100개 좋아요 ID를 읽고, 현재도 공개 상태인 사진만 최신 좋아요 순서로 5분 서명해 표시한다. 공개 사진 상세는 낙관적 좋아요·취소와 서버가 반환한 원자적 총수를 반영하고, 목록 취소와 상세 변경 모두 실패 시 이전 상태로 되돌린다. 로컬 Supabase 실제 역할 검증에서 RPC 공개 사진 추가·취소, 비소유 비공개 사진 거부, 비공개 전환 목록 제외와 anon 실행 거부가 통과했다.
- 공개 사진 상세에 댓글 로딩·재시도·작성·본인 삭제와 실패 복구를 연결했다. 댓글은 공백 제거 후 1~1,000자로 제한하고 서버가 작성 시각을 덮어써 시간 역조작을 막으며 계정별 60초당 5개까지만 허용한다. 빈 로컬 Supabase에서 전체 마이그레이션 재생, 스키마 lint, 입력 정규화, 시간 역조작을 포함한 도배 차단, 타인 삭제 거부, 본인 삭제, 비공개 전환 후 익명 숨김, 트리거 함수 직접 실행 거부를 검증했다. 관련 집중 테스트 7개, 모바일 린트·타입 검사·스키마 검증과 iOS·Android·웹 내보내기, 웹 테스트 511개와 빌드가 통과했다. 전체 모바일 테스트는 174개 통과, 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했다.
- 공개 사진 상세에 사유 선택형 신고와 확인형 사용자 차단을 추가하고, 내 프로필에서 차단 사용자 스냅샷 목록과 실패 복구가 있는 차단 해제를 제공한다. `content_reports`는 본인 신고 조회·작성만 허용하고 수정·삭제를 거부하며, 서버 시각·상태 고정, 대기 신고 중복 방지, 24시간당 10개 제한을 적용했다. `user_blocks`는 본인 행 조회·작성·삭제만 허용하고 차단한 사용자에게만 대상 프로필·사진·댓글을 RLS에서 숨긴다. 빈 로컬 Supabase 재생 뒤 기존 링크·좋아요·댓글 검증과 신규 신고·차단 역할 검증, DB lint·security/performance advisors가 모두 통과했다. 운영 문서에는 1시간·24시간·72시간 대응, 증거 보존, 이의 제기와 롤백을 기록했다. 관련 집중 테스트 12개, 모바일 린트·타입 검사·스키마 검증과 iOS·Android·웹 내보내기, 웹 테스트 517개와 빌드가 통과했다. 전체 모바일 테스트는 183개 통과, 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했다.
- 로그인 프로필에 이름·소개·아바타 편집을 연결했다. 아바타는 정사각형 선택 뒤 최대 변 512px JPEG로 다시 렌더링하고 게시 이미지와 같은 파서로 APP0~APP15·COM 메타데이터를 제거해 2MiB 이하만 전송한다. 공개 `avatars` 버킷은 소유자 UUID 폴더와 불변 UUID 파일명, JPEG MIME, INSERT·본인 SELECT·본인 DELETE만 허용한다. 프로필 DB 전환 실패 시 새 객체를 보상 삭제하고 성공 뒤 이전 객체를 지우며, 삭제 지연은 저장 성공과 구분해 알린다. 빈 로컬 Supabase 재생, DB lint·security/performance advisors, 실제 클라이언트 소유자·비소유자·익명 Storage 왕복 검증이 통과했다. 기존 웹·OAuth `avatar_url`은 유지하고 모바일 `avatar_path`를 우선해 호환성을 보존했다.
- 로그인 프로필 화면에 기존 편집·계정 이메일·로그아웃·차단 설정과 함께 공개 사진 요약을 추가했다. 본인의 공개 사진만 최대 12개 조회·서명하고 화면에는 최근 6장과 조회된 최근 공개 사진 수를 표시하며, 빈 상태·안전한 재시도와 공개 사진 상세 이동을 제공한다. 관련 집중 테스트 12개, 타입 검사·린트·Expo 의존성 검사·iOS/Android/웹 내보내기, 웹 테스트 519개와 빌드가 통과했다. 전체 모바일 테스트는 194개 중 192개가 통과했고 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했다.
- 프로필에 계정 삭제 경고와 정확한 확인 문구 입력을 추가했다. 기기 정리는 백업 제외 SQLite의 게시 작업·tombstone·체크포인트·자산 행과 썸네일·게시 파생본을 삭제하되 원본 사진은 유지한다. `delete-account` Edge Function은 access token을 재검증하고 대상의 `photos`·`avatars` 객체, 연결 DB 행, Auth 사용자 순으로 삭제한다. 로컬 왕복에서 미인증 401, 오확인 400, 정상 200과 대상 Auth·DB·Storage 제거, 비교 사용자 보존을 검증했다. 웹 테스트 520개, 웹 빌드, 모바일 집중 테스트 6개, 타입 검사·린트·로컬 스키마 검증·iOS/Android/웹 내보내기가 통과했다. 전체 모바일 테스트는 200개 중 198개가 통과했고 기존 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개 실패했다. 운영 Supabase 배포·원격 재검증은 별도 출시 관문으로 유지한다.
- 웹과 모바일의 공유 Supabase 공개 경계를 화면 캐시에도 적용했다. Explore, 좋아요, 공개 사진·댓글, 공개 프로필, 내 프로필 요약, 토큰 링크는 화면 재진입·포그라운드 복귀 시 기존 렌더링을 제거하고 현재 공개 범위를 재조회한다. 로컬 Supabase에서 비공개 전환 후 좋아요·댓글 숨김과 링크 토큰 해제 후 404를 왕복 검증했다. 관련 집중 테스트 23개, 웹 520개, 타입 검사·린트·로컬 스키마·iOS/Android/웹 내보내기가 통과했다. 전체 모바일 테스트는 208개 중 기능 테스트 206개가 통과했고, 기존 비공개 증빙 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개가 실패했다.
- 서명 URL 만료 안전성을 마무리했다. focus 중인 공개 사진 화면은 300초 URL을 270초에 재조회하고, background·focus 해제 시 갱신을 중지하며, 오프라인 실패 시 기존 서명 이미지 대신 재시도 상태를 보인다. 빈 로컬 Supabase 재생에서 누락됐던 private `photos` bucket과 관찰된 4개 Storage 정책을 정식 마이그레이션으로 복원했다. 실제 publishable-key 소유자·비소유자·익명 클라이언트로 public 서명 조회, private 거부, URL 만료, public→private 전환 거부를 확인했고 기존 좋아요·댓글·신고·차단·링크·프로필·계정 삭제 로컬 검증도 모두 통과했다. DB lint·security/performance advisors, 웹 테스트 520개·빌드, 모바일 타입 검사·린트·스키마·iOS/Android/웹 내보내기가 통과했다. 전체 모바일 테스트 210개 중 기능 테스트 208개가 통과했고, 기존 비공개 증빙 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개가 실패했다. 운영 배포는 하지 않았다.
- 모바일 앨범 제외 범위를 실행 가능한 테스트로 고정했다. 앱·소스 78개 파일을 재귀 검사해 웹 전용 `albums`·`album_photos` 테이블 호출, SQL 변경, 앨범 RPC·라우트가 없음을 확인했고 백엔드 계약 목록과도 대조했다. 웹 테스트 520개·빌드, 모바일 타입 검사·린트가 통과했다. 전체 모바일 테스트는 211개 중 기능 테스트 209개가 통과했고, 기존 비공개 증빙 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개가 실패했다.
- 모바일 Supabase 환경 경계를 코드와 빌드 설정에 고정했다. `development`는 로컬·사설 주소, `preview`는 운영과 다른 HTTPS Supabase 프로젝트, `production`은 웹과 공유하는 운영 프로젝트 ref만 허용하며 미리보기·운영에서는 publishable key만 받는다. EAS 세 profile은 각각 같은 이름의 environment와 channel에 연결했고 URL·키는 저장소에 넣지 않았다. 환경 계약 집중 테스트 8개, 웹 테스트 520개·빌드, 모바일 타입 검사·린트·로컬 스키마 검증·iOS/Android/웹 내보내기가 통과했다. 전체 모바일 테스트는 216개 중 기능 테스트 214개가 통과했고, 기존 비공개 증빙 `.omo/evidence/task-5/backend/live/catalog-sanitized.json` 누락으로만 2개가 실패했다. 별도 Preview Supabase 생성, EAS environment 값 등록, 서명 빌드 왕복은 외부 출시 관문으로 남겼다.
- 연결된 운영 Supabase에서 사용자 행을 조회하지 않고 마이그레이션·공개 함수·정책·버킷 메타데이터와 advisors를 SELECT로 재검사해 누락된 정제 증빙을 복구했다. 계약 시각과 SHA-256을 현재 증빙에 묶었고 정책 계약 집중 테스트 5개와 정제 보고서가 통과했다. 이어 Node.js 22 기반 모바일 GitHub Actions workflow를 추가해 잠금 설치, 린트, 타입 검사, 전체 테스트, 로컬 스키마 복구 검증을 고정했다. 계약 테스트 4개, 모바일 전체 테스트 216개, 타입 검사·린트·스키마 검증이 모두 통과했다. 운영 데이터·스키마에는 쓰지 않았고 원격 CI 성공 확인 전에는 CI 체크 항목을 미완료로 유지한다.
- Expo 57 의존성 상태를 공식 도구로 재검사했다. 초기 Doctor 실패 2건을 테스트로 고정한 뒤 SDK 57에서 불필요한 `newArchEnabled`를 제거하고, 로컬 모듈의 `ios`·`android` 소스를 숨기던 ignore 패턴을 루트 전용으로 수정했다. `expo-doctor` 1.20.3과 `expo install --check`를 잠금 의존성과 CI에 추가했다. Doctor 21/21, 의존성 검사, 계약 테스트 5개, 모바일 전체 테스트 216개, 타입 검사·린트·스키마 검증·iOS/Android/웹 내보내기가 통과했다.
- 모바일 출시 파일 유출 검사를 실행 가능한 CI 관문으로 추가했다. 실제 비밀 키·JWT·API key·인증정보 포함 DB URL·개인키, 비예시 이메일, 정밀 좌표 상수, 민감 세션·위치 로깅, 로그·환경·서명 파일, 승인되지 않은 사진 자산을 탐지하며 일치 내용은 출력하지 않는다. 탐지·허용·현재 저장소 테스트 4개와 CI 계약 테스트가 통과했고, 현재 출시 범위 200개 파일·197개 텍스트에서 발견 0건을 확인했다.
- 모바일 장애 운영 지침을 현재 기능에 맞춰 고정했다. `expo-updates`가 없는 현 상태에서 EAS build channel을 OTA로 오인하지 않고 스토어 새 바이너리로 복구하며, 향후 승인된 EAS Update 도입 전에는 update rollback을 실행하지 않는다. P0~P3, 표면별 순방향 복구, 원본 보존, N/N-1 공유 백엔드 확장→이행→관찰→축소, 제한적인 강제 업그레이드와 오프라인 로컬 접근 보존을 문서화했다. 계약 테스트 5개가 통과했다.
- 모바일 비용 경보를 공급자 가격 숫자가 아닌 현재 플랜 대비 비율로 정의했다. API·Maps SDK·Storage·이미지 egress·Edge Function·MAU에 70% 경고, 90% 조치, 7일 기준선 2배 이상치를 적용하고 개인정보 없는 집계만 허용했다. 비용 완화가 공개 범위·RLS·원본 사진을 훼손하지 않도록 조치 순서를 고정했으며 계약 테스트 4개가 통과했다. 실제 결제 대시보드 알림과 수신자는 외부 출시 설정으로 유지한다.
- 모바일 핵심 출시 여정을 하나의 통합 테스트로 연결했다. 인증 세션 검증, 전체 미디어 권한, 기기 사진 스캔·체크포인트, 게시 선택 라우트, private Storage 게시와 공개 Explore 서명 조회, 좋아요 추가·목록 반영, 계정 로컬 데이터 정리를 순서대로 실행하며 원본 기기 사진 삭제 SQL이 없음을 확인한다. 집중 테스트와 TypeScript 검사가 통과했다.
- 모바일 게시 삭제 수명주기를 구현했다. 게시 완료 상태에서 두 번 확인한 뒤 소유자 범위 DB 행, private Storage 객체, 로컬 성공 작업 순으로 삭제하며 원격 단계 실패 시 로컬 작업을 유지한다. 앱 재설치의 빈 SQLite를 OS 사진 참조로 재구축하고 OS에서 원본이 사라진 뒤 앱 인덱스·썸네일만 정리하는 통합 테스트를 추가했다. 관련 집중 테스트 14개, 타입 검사·린트·로컬 스키마 검증이 통과했다. 실제 역할 왕복은 Docker·Podman 부재로 실행하지 못해 체크 항목을 미완료로 유지했다.
- 비밀번호 재설정 완료 화면을 테스트 가능한 경계로 분리하고 입력 검증을 공유 인증 모듈로 통합했다. 일치하지 않는 입력은 네트워크 호출 전에 거부하고, 성공 전에는 프로필 이동을 노출하지 않으며, 공급자 내부 오류 대신 재시도 가능한 안전한 문구를 표시한다. 가입·로그인·메일 요청·콜백·새 비밀번호 집중 테스트 15개가 통과했다. 운영 메일 전체 왕복과 계정 연결 정책은 외부 출시 관문으로 유지한다.
- 이번 묶음의 전체 회귀를 다시 실행했다. 모바일 66개 suite·225개 테스트, TypeScript, Expo lint, 로컬 스키마 fresh·upgrade·corruption·invalid 시나리오, 출시 파일 205개 유출 검사, Expo Doctor 21/21과 의존성 호환 검사, iOS·Android·웹 정적 내보내기가 통과했다. 공유 웹은 536개 테스트와 Vite 운영 빌드가 통과했다. 역할 기반 사진 삭제 왕복만 로컬 Docker·Podman 부재로 실행하지 못했으며 운영 쓰기는 수행하지 않았다.
- 화면 상태·접근성 감사를 코드 계약으로 전환했다. 공유 링크의 unavailable과 네트워크 재시도 상태, Explore 추가 페이지 실패 보존·재시도, 인증 공급자 오류 비노출을 구현했다. 앱·소스의 모든 `Pressable` 역할, 핵심 44pt 터치 대상과 WCAG AA 색 대비를 자동 검사하며 감사 문서에 화면별 상태와 남은 VoiceOver·TalkBack 실기기 관문을 분리했다. 또한 migration·손상 대체·중단 스캔·재설치 전체 근거를 재검토해 해당 체크 항목을 완료로 전환했다.
- 화면 상태·접근성 묶음의 전체 검증이 통과했다. 모바일 67개 suite·232개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 206개 출시 파일·203개 텍스트 유출 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 내보내기가 모두 성공했다. 공유 웹 536개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 53/99 완료다.
- 모바일 성능 예산을 실행 가능한 출시 계약으로 추가했다. production export에서 플랫폼별 엔트리, 최대 자산, 전체 산출물 크기를 측정하고 현재 기준선보다 약 10~15% 큰 회귀 한도를 적용한다. 코드에 고정된 512MiB 썸네일 캐시, 512px 썸네일, 2,048px 게시 파생본, 동시 처리·선택·페이지·스캔·서명 URL 갱신 상한도 함께 검사하며 CI가 export 직후 실행한다. 실기기 시작 속도·FPS·메모리·저장공간·제한 네트워크·배터리 기준과 개인정보 없는 측정 기록 형식은 별도 문서에 고정했다.
- 성능 계약 추가 후 전체 검증이 통과했다. 모바일 67개 suite·232개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 208개 출시 파일·205개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 성공했다. 공유 웹은 539개 테스트와 Vite 운영 빌드가 통과했다. 실기기 수치를 아직 주장하지 않으므로 체크리스트는 53/99 완료를 유지한다.
- Explore에 Expo Network 기반 연결 상태 경계를 추가했다. 최초 오프라인 진입은 Supabase 요청 없이 안내와 재시도를 표시하고, 추가 페이지 직전 또는 실패 후 오프라인이 확인되면 기존 사진과 선택 상태를 유지한다. 일반 네트워크 실패는 백엔드 상세를 노출하지 않으며 모든 재시도는 현재 offset을 재사용한다. 운영 지도 SDK의 검색·키·할당량 콜백은 외부 지도 설정 뒤 연결해야 하므로 해당 항목은 미완료로 유지했다.
- Explore 오프라인 복구 추가 후 모바일 67개 suite·234개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 209개 출시 파일·206개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 53/99 완료다.
- Explore 고정 지도 캔버스에 근접 마커 군집을 추가했다. 인접 셀까지 비교하는 그리드 기반 군집으로 경계에서 가까운 사진이 분리되지 않게 하고, 입력 순서·안정 키·표시 범위를 보존한다. 군집 마커는 포함 사진 수를 표시하고 반복 선택으로 내부 사진을 순환하며, 단일·군집·선택 상태별 색과 접근성 이름을 구분한다. 실제 지도 zoom·viewport 결합은 운영 지도 SDK 연결 뒤의 관문으로 유지했다.
- 마커 군집 추가 후 모바일 68개 suite·239개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 211개 출시 파일·208개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 53/99 완료다.
- 공개 원격 이미지 실패를 공통 복구 경계로 통합했다. Explore 미리보기, 공개 상세, 좋아요, 공개 프로필, 내 프로필 공개 요약, 비공개 링크에서 이미지 로드가 실패하면 원시 URL·Storage 오류 대신 대체 상태와 44pt 재시도 동작을 표시한다. 재시도는 같은 URL만 다시 그리지 않고 화면의 공개 범위 또는 비밀 링크를 재검증해 현재 권한의 새 서명 URL을 받으며, URL이 바뀌면 실패 상태를 자동 해제한다.
- 이미지 복구 추가 후 모바일 69개 suite·245개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 213개 출시 파일·210개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 53/99 완료다.
- 로컬 기기 썸네일 실패를 한 장 단위로 복구하도록 구현했다. 내 사진 격자와 기기 사진 상세에서 디코딩 실패가 발생하면 안전한 대체 상태를 표시하고, 명시적 재시도 시 해시 키의 캐시 파일과 인덱스 항목을 먼저 제거한 뒤 원본 사진에서 512px 썸네일을 다시 생성한다. 보관함 전체 재스캔, 원본 수정·삭제, 내부 파일 오류 노출은 하지 않으며 원본 접근이 사라진 경우 재시도 가능한 상태를 유지한다.
- 로컬 썸네일 복구 추가 후 모바일 70개 suite·250개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 216개 출시 파일·213개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 53/99 완료다.
- 360px·390px 입력 화면 경계를 코드로 보강했다. 네이티브 SafeArea 안에 공통 `KeyboardAvoidingView`·`ScrollView` 경계를 두어 로그인, 비밀번호 변경, 프로필 편집·계정 삭제, 공개 사진 댓글·신고를 키보드 상태에서도 스크롤할 수 있게 했다. 360px·390px 여백과 세로 고정 정책을 순수 함수·설정 계약으로 검증했다. 실기기의 최대 글자 크기·안전 영역·실제 키보드는 남아 해당 체크 항목을 미완료로 유지했다.
- 반응형·키보드 보강 후 모바일 72개 suite·254개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 220개 출시 파일·217개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 실기기 관문이 남아 체크리스트는 53/99 완료를 유지한다.
- 출시용 Ikkyee 아이콘 자산을 추가했다. 기존 브랜드 마크의 위치 핀·잎·점선 경로를 보존해 1024px RGB 스토어 아이콘과 RGBA Android 적응형·테마 전경, 512px 파비콘을 만들었다. `expo-splash-screen` 구성 플러그인으로 시작 화면을 연결하고, 자산 출처·프롬프트·SHA-256을 문서화했다. 실기기 release 마스크·시작 화면과 스토어 스크린샷·설명 승인이 남아 상위 항목은 미완료로 유지했다.
- 앱 자산 추가 후 모바일 73개 suite·256개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 223개 출시 파일·218개 텍스트 유출 검사, 성능 검사, Expo Doctor 21/21과 의존성 검사, iOS·Android·웹 production export가 통과했다. 공유 웹 539개 테스트와 Vite 운영 빌드도 통과했으며 실기기·스토어 승인 관문이 남아 체크리스트는 53/99 완료를 유지한다.
- Explore에 `react-native-maps` 네이티브 Google 지도 경계를 추가했다. 키가 없는 development·web은 외부 요청 없는 대체 지도를 유지하고, preview·production은 Android·iOS 키가 둘 다 없으면 config 단계에서 실패한다. 유효한 pan·zoom bounds만 수용해 이전 요청을 취소하고 offset 0으로 재조회하며, 페이지네이션·군집 중심·안정 ID·선택 상태를 변경된 영역에 연결했다. Google Cloud 플랫폼 제한과 서명 release 실기기 검증은 외부 관문으로 남겼다.
- 네이티브 지도 추가 후 모바일 75개 suite·263개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 232개 출시 파일·227개 텍스트 유출 검사, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 542개 테스트와 Vite 운영 빌드도 통과했으며, 지도 조회·군집 항목 2개를 완료해 체크리스트는 55/99다. 현재 export 지표는 Android 4,032,799B, iOS 3,728,812B, web 1,667,028B, 최대 자산 962,968B, 전체 10,972,907B다.
- 웹·모바일·DB의 `hidden`·`approximate`·`exact` 위치 정책을 하나의 행렬로 대조했다. 모바일 Explore가 DB 트리거에만 의존하지 않고 조회·행 파서에서도 숨김 위치를 거부하도록 보강했다. 모바일 신규 게시는 현재 위치 선택 UI가 없어 모두 `hidden`이며, 이를 정확 위치 공개 기능이 있는 것처럼 주장하지 않는다.
- 공개 위치 정책 보강 후 모바일 75개 suite·264개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 232개 출시 파일·227개 텍스트 유출 검사, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 545개 테스트와 Vite 운영 빌드도 통과했으며 체크리스트는 56/99다. 현재 export 지표는 Android 4,032,960B, iOS 3,728,908B, web 1,667,161B, 최대 자산 962,968B, 전체 10,973,297B다.
- 13개 Expo Router 화면과 Explore·로컬 사진·게시·인증·복구의 핵심 이동 간선을 출시 계약으로 고정했다. 새 계약 테스트 3개와 공유 웹 전체 548개 테스트, Vite 운영 빌드가 통과했다. 직전 모바일 전체 75개 suite·264개 테스트·세 플랫폼 export 결과와 함께 화면 이동 항목을 완료해 체크리스트는 57/99다. Android 백 버튼·iOS swipe-back·유니버설/앱 링크 재진입은 실기기 QA 항목에서 별도로 남겨 두었다.
- 네이티브 Places Text Search와 공개 사진 범위를 Explore에 연결했다. Android·Apple Expo 자동 연결, 임시 iOS·Android prebuild와 Swift 구문 검사가 통과했다. 이 환경에는 JDK와 CocoaPods가 없어 실제 네이티브 컴파일은 서명 빌드 관문에 남겼다. 모바일 78개 suite·275개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 245개 출시 파일·238개 텍스트 유출 검사, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 552개 테스트와 Vite 운영 빌드도 통과해 체크리스트는 58/99다. 현재 export 지표는 Android 4,045,134B, iOS 3,741,165B, web 1,675,205B, 최대 자산 962,968B, 전체 11,010,179B다.
- 네이티브 Places 오류를 네트워크·할당량·구성·SDK 미사용으로 분류해 안전한 한글 안내와 재시도 정책에 연결했다. Android `PlacesStatusCodes`와 iOS `GMSPlacesErrorCode`를 공통 코드로 투영하고, 구성·SDK 미사용 오류에는 무의미한 재시도 버튼을 노출하지 않는다. 실제 운영 키의 차단·할당량 오류 재현은 서명 빌드 외부 관문으로 남겼다.
- 운영 사진 공유 링크를 고정 HTTPS origin의 fragment 토큰 방식으로 바꾸고 Universal Links·App Links 네이티브 구성, fail-closed AASA·Digital Asset Links, 앱 미설치 대체 화면을 구현했다. 임시 iOS·Android prebuild, Expo 자동 연결, Swift 구문, 로컬 Cloudflare 응답을 확인했다. 전체 검증은 모바일 79개 suite·283개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 247개 출시 파일·240개 텍스트 유출 검사 0건, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 557개 테스트와 Vite 운영 빌드도 통과했으며 자산 항목을 완료해 체크리스트는 59/99다. 현재 export 지표는 Android 4,048,601B, iOS 3,744,610B, web 1,678,197B, 최대 자산 962,968B, 전체 11,046,079B다. Apple Team ID·Android 출시 서명 SHA-256 등록, Cloudflare 배포, 서명 실기기 검증은 미완료로 유지했다.
- 대표 프로필의 계정 연결 경계를 구현했다. 같은 검증 이메일은 Supabase 자동 identity linking에 맡기고, 다른 이메일·이메일 없는 Kakao는 로그인된 프로필에서 Google·Kakao를 명시적으로 연결한다. 콜백 뒤 서버 사용자 ID가 바뀌면 로컬 세션을 폐기하며, 앱은 잠김 위험이 있는 연결 해제를 제공하지 않는다. Supabase 작업 지침과 최신 공식 문서를 확인해 `user_metadata`나 이메일 문자열을 권한·병합 근거로 사용하지 않았다. 전체 검증은 모바일 81개 suite·291개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 251개 출시 파일·244개 텍스트 유출 검사 0건, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 559개 테스트와 Vite 운영 빌드도 통과했다. 현재 export 지표는 Android 4,056,957B, iOS 3,752,915B, web 1,683,131B, 최대 자산 962,968B, 전체 11,068,225B다. 운영 **Enable Manual Linking**, 공급자 설정과 서명 실기기 연결 검증이 남아 체크리스트는 59/99를 유지한다.
- 존재한다고 기록됐지만 실제로 누락돼 있던 Maestro Explore smoke workflow를 복구했다. 독립 앱 ID, 초기 상태, 권한 거부, Explore 빈 검색, 내 사진 권한 안내, 좋아요·프로필 이동을 개인정보 없는 안정 접근성 ID로 고정하고 Expo Go·전체 Keychain 초기화를 출시 근거에서 제외했다. 계약 테스트 3개를 포함한 공유 웹 562개 테스트와 Vite 운영 빌드가 통과했다. 모바일은 81개 suite·291개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 251개 출시 파일·244개 텍스트 유출 검사 0건, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 현재 export 지표는 Android 4,057,264B, iOS 3,753,160B, web 1,683,354B, 최대 자산 962,968B, 전체 11,069,831B다. 설치된 양 플랫폼 standalone 빌드와 실행 기기가 없어 실제 Maestro 실행은 미완료이며 체크리스트는 59/99를 유지한다.
- Apple·Google 스토어 개인정보 제출 초안을 코드 기반 원장으로 고정했다. 기기 사진 원본·EXIF/GPS·SQLite·썸네일의 로컬 전용 경계와 명시적으로 게시되는 Supabase 데이터, Maps/Places·OAuth 처리자를 구분하고 Expo iOS 개인정보 매니페스트에 연결했다. 설치된 13개 SDK 매니페스트와의 포함 관계를 CI에서 검사하며 임시 production iOS prebuild 결과도 확인했다. 전체 검증은 모바일 81개 suite·291개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 253개 출시 파일·246개 텍스트 유출 검사 0건, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 568개 테스트와 Vite 운영 빌드도 통과했다. 현재 export 지표는 Android 4,057,116B, iOS 3,753,127B, web 1,683,351B, 최대 자산 962,968B, 전체 11,069,647B다. App Store Connect·Google Play Console 입력, archive Privacy Report, 공급자 계약 및 운영자·법률 승인이 남아 체크리스트는 59/99를 유지한다.
- 인증 리디렉션·로컬 데이터·로그·공유 링크·RLS·Storage 출시 보안 검토를 완료했다. 인증 callback exact-match와 OAuth URL scheme 검증, 공급자 오류 비식별화를 구현하고 정적 보안 감사를 CI에 연결했다. 빈 로컬 Supabase를 재생해 8개 역할·Storage 검증과 DB lint·security advisor를 통과했으며, 검증 중 링크 fixture가 영구 photos 버킷을 삭제하던 cleanup과 최신 Storage API의 0행 DELETE 응답 오판을 수정했다. 전체 검증은 모바일 81개 suite·299개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 254개 출시 파일·247개 텍스트 유출 검사 0건, 보안 경계 6개, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 573개 테스트와 Vite 운영 빌드도 통과했다. 현재 export 지표는 Android 4,058,306B, iOS 3,754,295B, web 1,684,524B, 최대 자산 962,968B, 전체 11,073,178B다. 운영 원격 정책 적용·재검증과 Auth Dashboard·서명 실기기 관문은 별도 미완료 항목에 남기고 체크리스트는 60/99다.
- Expo SDK 57 출시 설치 하한을 iPhone iOS 16.4와 Android 7.0(API 24)으로 고정하고 QA 기기 등급을 문서화했다. `expo-build-properties`와 CI drift 검사를 연결했으며 임시 production prebuild에서 Android Gradle과 iOS Pods·Xcode 생성값을 확인한 뒤 생성물을 삭제했다. 이전 보안 검토에서 완료한 소유자·비소유자 사진 DB·Storage 삭제 왕복 근거도 출시 원장에 반영했다. 전체 검증은 모바일 81개 suite·299개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 256개 출시 파일·249개 텍스트 유출 검사 0건, 개인정보·보안·플랫폼 검사, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 579개 테스트와 Vite 운영 빌드도 통과했다. 현재 export 지표는 Android 4,058,307B, iOS 3,754,295B, web 1,684,524B, 최대 자산 962,968B, 전체 11,073,179B이며 체크리스트는 62/99다. 서명 release 실기기 QA와 스토어 배포는 별도 미완료 관문으로 유지한다.
- 웹 `1be7f51`의 랜딩·로그인·Explore·사진 상세 변경을 모바일에 반영했다. 랜딩 문구와 지도 CTA 배경, 공통 기본 아바타, 간결한 인증 선택 화면을 동기화했다. 로그인 사용자는 Explore에서 모든 소유 위치 사진을 먼저 보고, 비공개 사진은 RLS로 보호된 owner-only 위치에서만 표시한다. 다른 사람 범위는 공개 사진과 공개 가능한 위치만 유지한다. 초기 소유 사진 범위 맞춤, 군집의 여유 있는 애니메이션 확대, 상세의 스크롤 안내·하트 모션·소유자 전용 공개 상태·Explore 초점 이동·exact 전용 외부 거리뷰도 연결했다. Expo SDK 57 패치 의존성을 정합 버전으로 올리고 잠금 파일을 갱신했다. 390px 로컬 웹 QA에서 랜딩 한글 단어 줄바꿈을 보정하고 로그인·Explore 대체 화면까지 다시 렌더링해 콘솔 오류·경고 0건을 확인했다. 최종 검증은 모바일 83개 suite·309개 테스트, 타입 검사, Expo lint, 로컬 스키마 4개 시나리오, 266개 출시 파일·257개 텍스트 유출 검사 0건, 개인정보·보안·플랫폼 검사, Expo Doctor 21/21, iOS·Android·웹 production export와 성능 예산이 통과했다. 공유 웹 596개 테스트와 Vite 운영 빌드도 통과했다. 현재 export 지표는 Android 4,103,836B, iOS 3,792,422B, web 1,708,385B, 최대 자산 963,776B, 전체 11,759,794B다. 자동 검증으로 실기기 항목을 대신 완료 처리하지 않아 체크리스트는 62/99를 유지하며, 다음 관문은 서명된 iPhone·Android에서의 화면·OAuth·지도·딥링크 확인이다. (2026-08-28)
- 2026-08-30 코드 출시 후보 검증에서 웹과 추천 검색어를 `제주 바다·서울 야경·일본`으로 다시 맞추고 Expo `57.0.18`, `expo-constants` `57.0.16` 호환 패치를 적용했다. Expo Doctor 21/21, 플랫폼·출시 파일·개인정보·보안 검사, lint, typecheck, 모바일 83개 suite·309개 테스트, 로컬 스키마 4개 시나리오, Android·iOS·Web production export와 성능 예산이 통과했다. 현재 export 지표는 Android 4,103,343B, iOS 3,791,938B, web 1,707,834B, 최대 자산 963,776B, 전체 11,594,997B다. 공유 웹은 640개 테스트와 성능 예산을 통과했다. 운영 Supabase에는 모바일 전용 링크·신고·계정 삭제 마이그레이션과 Edge Functions가 아직 배포되지 않았고 서명 실기기·스토어 관문도 남아 있으므로 체크리스트는 62/99를 유지한다.
