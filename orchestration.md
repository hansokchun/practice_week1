# Travelgram (Ikkyee) — 프로젝트 오케스트레이션 문서

> **사진 기반 여행 기록 웹 앱** — 사진을 업로드하면 EXIF 위치·시간 데이터를 자동 추출하여 인터랙티브 지도 위에 핀으로 시각화하고, 앨범으로 분류·공유·소셜 기능(좋아요, 댓글)을 제공하는 SPA(Single Page Application)입니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| **프로젝트명** | Travelgram (코드네임: Ikkyee) |
| **유형** | 사진 기반 여행 기록 & 소셜 웹 앱 (SPA) |
| **배포** | Cloudflare Pages (Vite 빌드 → `dist/` 출력) |
| **백엔드** | Supabase (Auth + PostgreSQL + Storage) — 서버리스 |
| **저장소** | `github.com/hansokchun/practice_week1` |
| **빌드 도구** | Vite 8.x |
| **주요 타깃** | 데스크탑 + 모바일 (반응형) |

### 핵심 가치
- **"Archive your moments, Map your journey."** — 여행 사진을 올리면 자동으로 지도 위에 핀이 생기고, 앨범별로 경로선(Polyline)까지 그려져 여행 동선을 한눈에 볼 수 있음.

---

## 2. 기능 목록

### 2.1 사진 관리
- **업로드**: 파일 선택 또는 드래그&드롭으로 다중 업로드
- **EXIF 자동 추출**: GPS 좌표(위도/경도), 촬영 날짜·시간 자동 파싱
- **위치 없는 사진**: 지도 클릭으로 수동 위치 지정 (Location Picker)
- **이미지 최적화**: Canvas 기반 3단계 압축 (micro 100px / grid 400px / detail 1200px)
- **수정**: 제목, 날짜, 시간, 위치 수정 + 지도에서 위치 재지정 가능
- **삭제**: Storage 3파일 + DB 레코드 + 관련 댓글(CASCADE) 동시 삭제

### 2.2 지도 시각화
- **Leaflet 인터랙티브 지도**: Google Maps 타일, 한국어 지원
- **사진 썸네일 핀**: 사진의 micro 이미지를 핀 아이콘으로 사용
- **마커 클러스터링**: `leaflet.markercluster`로 가까운 핀 자동 그룹화 (줌 15 이상에서 해제)
- **앨범 경로선**: 앨범 내 사진을 시간순 정렬 후 Polyline으로 여행 동선 시각화
- **Google Places 검색**: 지도 위 장소·상호명 검색 (Autocomplete)
- **시점 오프셋**: 사이드바에 가려지지 않는 영역 중앙으로 마커 시점 이동 (`panToVisible`)

### 2.3 소셜 기능
- **커뮤니티 피드**: `shared = true`인 사진만 모아 보는 전체 공개 갤러리
- **좋아요**: 서버 동기화 (`user_likes` 테이블), RPC 기반 안전한 증감
- **댓글**: 사진별 댓글 작성/조회 (`comments` 테이블)
- **유저 프로필**: 닉네임, 아바타, 스토리 수, 받은 좋아요 수 표시
- **정렬 필터**: 최신순 / 이번 달 베스트 / 오늘 베스트

### 2.4 앨범 관리
- **앨범 분류**: 사진에 `album` 속성을 부여하여 그룹화
- **앨범 탭**: 프로필 페이지에서 "모든 사진" ↔ "앨범" 탭 전환
- **앨범 삭제**: 앨범 폴더 삭제 시 소속 사진의 album 속성을 일괄 해제
- **앨범 공유**: 앨범 단위로 공유 상태 일괄 토글

### 2.5 인증 & 프로필
- **이메일 로그인/가입**: Supabase Auth (비밀번호 6자 이상)
- **Google OAuth**: 소셜 로그인
- **프로필 편집**: 닉네임 (중복 검사), 연령대, 성별, 아바타 이미지 업로드
- **닉네임 DB 동기화**: `profiles` 테이블에 닉네임 저장 (unique constraint)

### 2.6 UX 편의 기능
- **새로고침 상태 복원**: `sessionStorage` 기반으로 현재 페이지(상세/프로필/앨범/피드) 유지
- **딥 링크**: URL 해시(`#photoId`)로 특정 사진 바로 열기 (공유 URL)
- **모바일 드래그 핸들**: 사이드바를 터치 드래그로 높이 조절
- **토스트 알림**: 성공/경고/정보 메시지 자동 소멸
- **스플래시 스크린**: 배경 이미지 슬라이더 + "Get Started" 진입

---

## 3. 프로젝트 구조

```
Ikkyee/
├── index.html          # SPA 단일 HTML (모든 패널 포함)
├── style.css           # 전역 스타일 (29KB, 반응형 포함)
├── auth.js             # Supabase 올인원 모듈 (Auth + DB + Storage API)
├── orchestration.md    # 이 문서 (프로젝트 규칙 및 분석)
├── vite.config.mjs     # Vite 빌드 설정
├── wrangler.toml       # Cloudflare Pages 배포 설정
├── package.json        # 의존성 (vite만 devDep)
│
├── js/                 # ES Module 기반 앱 코드 (11개 모듈)
│   ├── app.js          # 진입점 — 모듈 초기화 오케스트레이터
│   ├── state.js        # 전역 상태(state) + DOM 캐시(ui) + 페이지 저장/복원
│   ├── render.js       # 데이터 동기화(syncData) + 그리드/지도 렌더링(renderAll)
│   ├── detail.js       # 사진 상세 보기 + 수정 + 댓글
│   ├── profile.js      # 유저 프로필 + 앨범 관리 + 갤러리
│   ├── events.js       # 전역 이벤트 핸들러 (좋아요, 공유, 삭제, 드래그&드롭 등)
│   ├── map.js          # Leaflet 지도 초기화 + Google Places + panToVisible
│   ├── upload.js       # 파일 업로드 + EXIF 파싱 + 이미지 압축
│   ├── auth-guard.js   # 인증 상태 UI + 프로필 팝업
│   ├── login.js        # 로그인/회원가입 모달
│   └── mobile.js       # 모바일 터치 드래그 핸들
│
├── images/             # 정적 이미지 (스플래시 배경, 로고 등)
└── dist/               # Vite 빌드 출력 (Cloudflare Pages 배포 대상)
```

---

## 4. 아키텍처 & 모듈 의존 관계

### 4.1 초기화 흐름 (`app.js`)
```
DOMContentLoaded
  ├─ getCurrentUser()           ← auth.js (Supabase 세션 확인)
  ├─ createState() / createUI() ← state.js
  ├─ initMap()                  ← map.js (Leaflet 초기화)
  ├─ initRender()               ← render.js (renderAll, syncData, showToast)
  ├─ initDetail()               ← detail.js (showDetail, closeDetail)
  ├─ initProfile()              ← profile.js (openProfilePage)
  ├─ initUpload()               ← upload.js (processFiles)
  ├─ initAuthGuard()            ← auth-guard.js (로그인 UI)
  ├─ initEvents()               ← events.js (전역 핸들러)
  ├─ initMobile()               ← mobile.js (터치 드래그)
  ├─ initLogin()                ← login.js (로그인 모달)
  ├─ await syncData()           ← 첫 데이터 로드
  └─ loadPageState() → 복원     ← 새로고침 시 이전 페이지로 이동
```

### 4.2 순환 참조 해결
- `renderAll`과 `showDetail`이 서로를 참조하므로, `app.js`에서 **지연 바인딩(lazy binding)** 패턴 사용:
  ```js
  const renderFns = initRender(ctx, { showDetail: (p) => showDetail(p) });
  ```

### 4.3 데이터 흐름
```
사진 업로드 → EXIF 파싱 → Canvas 3단계 압축 → Supabase Storage 업로드
  → DB upsert (photos 테이블) → syncData() → renderAll()
  → 사이드바 그리드 + 지도 마커 동시 갱신
```

---

## 5. 기술 스택 & 외부 의존성

| 카테고리 | 기술 | 역할 |
|---|---|---|
| **프론트엔드** | Vanilla JS (ES Modules) | 프레임워크 없이 순수 JS |
| **빌드** | Vite 8.x | 개발 서버 + 프로덕션 번들링 |
| **지도** | Leaflet 1.9.4 | 인터랙티브 지도 렌더링 |
| **클러스터** | leaflet.markercluster 1.5.3 | 마커 자동 그룹화 |
| **장소 검색** | Google Maps API (Places) | 장소명 자동완성 검색 |
| **EXIF** | exifr (lite UMD) | 사진 GPS/날짜 메타데이터 파싱 |
| **인증/DB** | Supabase JS SDK v2 | Auth + PostgreSQL + Storage |
| **배포** | Cloudflare Pages | 정적 사이트 호스팅 |
| **폰트** | Pretendard + Playfair Display | 본문(산세리프) + 제목(세리프) |

---

## 6. 디자인 & UI 구조

### 6.1 레이아웃
- **데스크탑**: 왼쪽 사이드바 (450px 고정) + 오른쪽 지도 (`right: 450px`로 자동 축소)
- **모바일 (≤768px)**: 하단 시트(Bottom Sheet) 스타일 사이드바 + 전체 화면 지도
- **패널 시스템**: 사이드바 내 3개 패널을 `.active` 클래스로 전환
  - `panel-explore`: 메인 피드 (그리드)
  - `panel-detail`: 사진 상세 보기 + 수정 + 댓글
  - `panel-user-profile`: 유저 프로필 + 앨범

### 6.2 스타일 시스템
- CSS Custom Properties 기반 (`--primary-color`, `--text-main`, `--border-color` 등)
- 폰트: `Pretendard` (본문), `Playfair Display` (제목 세리프)
- 스플래시: 5장 배경 이미지 자동 슬라이드 + 글래스모피즘 오버레이

### 6.3 반응형 분기점
- `768px` 기준으로 데스크탑/모바일 레이아웃 전환
- 모바일: 터치 드래그 핸들로 사이드바 높이 15vh ~ 100vh 조절 가능

---

## 7. 데이터베이스 스키마 (Supabase PostgreSQL)

### photos 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | text (PK) | 타임스탬프 기반 고유 ID |
| `url` | text | Storage 퍼블릭 URL (detail 사이즈) |
| `date` | text | 촬영 날짜+시간 (`YYYY-MM-DD HH:mm:ss`) |
| `title` | text | 사진 제목/설명 |
| `description` | text | 상세 설명 |
| `lat` / `lng` | float | GPS 좌표 |
| `liked` | integer | 좋아요 수 (RPC로 증감) |
| `shared` | boolean | 커뮤니티 공개 여부 |
| `owner_id` | uuid (FK) | 업로더 유저 ID |
| `album` | text | 소속 앨범명 (nullable) |
| `created_at` | timestamp | 서버 생성 시각 |

### user_likes 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `user_id` | uuid | 좋아요 누른 유저 |
| `photo_id` | text | 대상 사진 ID |

### comments 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `photo_id` | text | 대상 사진 ID |
| `text` | text | 댓글 내용 |
| `date` | timestamp | 작성 시각 |
| `author_id` | uuid | 작성자 유저 ID |

### profiles 테이블
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 유저 ID |
| `nickname` | text (UNIQUE) | 닉네임 |

### RLS (Row Level Security)
- **photos**: 누구나 SELECT 가능 / INSERT·UPDATE·DELETE는 본인(`owner_id`)만
- **좋아요 증감**: `increment_like`, `decrement_like` RPC 함수로 RLS 우회

---

## 8. Git Workflow & Branch Management Rule

1. **Auto-Push to `dev` ONLY**: 로컬 변경 사항은 커밋 후 반드시 `origin dev` 브랜치에만 푸시합니다.
2. **`main` is Manual**: `main` 브랜치는 사용자가 명시적으로 요청할 때만 병합/푸시합니다.

*이 규칙은 모든 세션에서 지속적으로 적용됩니다.*

---

## 9. 업데이트 기록

### [2026-05-10] 지도 UX 및 전역 상태 유지 고도화
1. **지도 시점(Viewport) 애니메이션 버그 수정**:
   - 위치 보기 중 사이드바 크기가 변할 때, Leaflet의 `panTo` 애니메이션이 `invalidateSize`와 충돌하여 취소되는 현상 발생.
   - `setView(..., { animate: false })`를 사용하여 리사이징과 충돌 없이 지도가 즉시 마커 위치로 이동하도록 수정.
2. **새로고침 시 현재 페이지(상태) 복원 기능**:
   - `sessionStorage` 기반으로 현재 보고 있는 페이지(상세/프로필/앨범/피드)를 저장하고, 새로고침 시 정확히 복원.
   - 기존 URL 해시(딥 링크) 방식은 sessionStorage가 없을 때 Fallback으로 통합.
   - 프로필 진입 시 URL 해시를 제거하여 상세→프로필→앨범 경로에서 딥 링크 충돌 방지.
3. **지도 핀(마커)과 사이드바 그리드 동기화**:
   - 내 피드, 커뮤니티 피드, 개별 유저 프로필, 특정 앨범 등 사이드바에 현재 노출된 사진 목록과 정확히 일치하는 데이터만 지도에 마커로 표시되도록 필터링 로직 수정.

### [2026-05-05] 모듈 분리 & 구조 리팩터링
- 1,973줄 단일 `main.js`를 11개 ES Module로 분해.
- Vite 빌드 시스템 도입.
- 순환 참조 해결을 위한 지연 바인딩 패턴 적용.

### [2026-05-01 ~ 05-04] 기능 개발
- EXIF 시간 추출 및 상세 페이지 시간 표시.
- 앨범 경로선(Polyline) 렌더링.
- 이미지 3단계 압축 최적화 (7.8MB → ~1MB).
- 좋아요 서버 동기화 (`user_likes` 테이블 도입).
- 모바일 핀치 줌 최적화 (`touch-action`, `tap: false`).
- 수정 취소 시 위치 복원, 수정 모드 UI 유지 등 UX 개선.

---

## 10. 향후 개발 계획

### 단기 (High Priority)
- [ ] **오프라인 지원**: Service Worker + IndexedDB 캐싱으로 오프라인 사진 조회
- [ ] **무한 스크롤**: 사진이 많아질 경우 대비 페이지네이션/가상 스크롤
- [ ] **알림 시스템**: 내 사진에 좋아요/댓글이 달렸을 때 실시간 알림

### 중기 (Medium Priority)
- [ ] **다크 모드**: CSS Custom Properties 기반 테마 전환
- [ ] **사진 필터**: 지도 위에서 날짜 범위/앨범 필터 슬라이더
- [ ] **타임라인 뷰**: 날짜별 세로 타임라인 형태의 사진 보기
- [ ] **i18n 다국어 지원**: 한국어/영어 전환

### 장기 (Low Priority)
- [ ] **AI 자동 태깅**: 사진 내용 자동 분석 및 태그 생성
- [ ] **여행 리포트**: 앨범별 통계 (이동 거리, 방문 도시 수 등) 자동 생성
- [ ] **팔로우 시스템**: 유저 간 팔로우/피드 구독

---

## 11. 주의사항 & 알려진 제약

1. **Supabase Anon Key**: `auth.js`에 하드코딩되어 있음. RLS 정책이 데이터 보호를 담당하므로 현재는 안전하지만, 프로덕션에서는 환경 변수로 분리 권장.
2. **Google Maps API Key**: `index.html`에 직접 노출. 도메인 제한(referrer restriction) 설정 필수.
3. **이미지 용량**: 원본은 저장하지 않고 detail(1200px)이 최대. 고해상도 원본이 필요하면 별도 tier 추가 필요.
4. **패널 겹침**: `activatePanel()` 유틸리티로 방지하고 있으나, 비동기 타이밍에 따라 간헐적 겹침 가능성 존재.
5. **모바일 사이드바 높이**: `vh` 단위 사용 시 iOS Safari 주소창 동적 높이에 의한 레이아웃 편차 가능.
