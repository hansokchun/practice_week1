# Travelgram 프로젝트 개요서 (Onboarding Guide)

환영합니다! 이 문서는 새로운 협업자가 **Travelgram** 프로젝트를 빠르게 파악하고 개발에 참여할 수 있도록 작성된 종합 보고서입니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: Travelgram (트래블그램)
- **한 줄 소개**: Archive your moments, Map your journey. (사용자의 여행 순간을 기록하고 지도 위에 매핑하는 플랫폼)
- **주요 목적**: EXIF 정보(GPS)가 포함된 사진을 업로드하면 지도 상에 핀이 생성되어 시각적으로 여행 기록을 탐색할 수 있고, 커뮤니티와 공유할 수 있는 웹 어플리케이션입니다.

---

## 2. 기술 스택 (Tech Stack)

**FE (프론트엔드)**
- **HTML5 / Vanilla JavaScript**: 복잡한 프레임워크 없이 순수 자바스크립트로 구현된 SPA(Single Page Application) 구조.
- **CSS3**: 반응형 웹 디자인, CSS 애니메이션, Glassmorphism(로그인 화면 등) 적용.

**BE (백엔드 / BaaS)**
- **Supabase**: 데이터 중심의 백엔드를 지원하는 오픈소스 Firebase 대안 플랫폼.
  - **Auth**: 이메일/비밀번호 회원가입 과정 및 Google OAuth 소셜 로그인.
  - **Database (PostgreSQL)**: `photos`, `comments` 등 데이터 저장 (RLS 정책 적용).
  - **Storage**: 사진 파일 등 미디어 스토리지 제공.

**핵심 라이브러리 (CDN 로드)**
- **Leaflet.js**: 지도 렌더링 및 인터랙션 조작.
- **Leaflet.markercluster**: 다중 핀 축소/확대 시 클러스터링(그룹화) 기능.
- **Exifr.js**: 이미지에서 EXIF 메타데이터(가장 중요한 GPS 위도/경도, 날짜 등) 추출.

---

## 3. 주요 기능 (Key Features)

### 🗺 지도 & 피드 (Map & Feed)
- **지도 연동**: 업로드된 사진의 GPS 데이터를 기반으로 지도 위에 핀(마커) 배치.
- **리스트/그리드 피드**: 지도 옆(우측 혹은 하단)의 사이드바를 통해 사진을 날짜별 그리드 형태로 조회. 그리드 밀도 조절 가능.
- **필터링 & 검색**: "Liked(좋아요한 사진)", "특정 날짜" 기반 필터링 및 내용 기반 텍스트 검색 기능.

### 📸 사진 관리 (Photo Management)
- **스마트 업로드**: 사진 첨부 시 브라우저 내에서 EXIF 정보를 파싱. 
  - GPS 데이터가 있으면 즉시 업로드 (Storage $\rightarrow$ DB 메타데이터 저장)
  - GPS 데이터가 없으면 지도에서 위치를 직접 클릭(Map Picker Guide 활성화)하여 위치 강제 지정 후 업로드.
- **위치 수정**: 이미 업로드된 사진도 지도에서 핀 위치를 이동시켜 재설정 가능.
- **상세 정보 수정**: 사진 제목(Title), 설명(Description) 수정 지원.
- **스트리트 뷰 연동**: 해당 사진의 위치를 구글 스트리트 뷰로 띄워보는 기능 (Iframe 연동).

### 👥 소셜 및 커뮤니티 플랫폼 (Social & Community)
- **My Stories vs Community**: 나만의 비공개 사진 코너와 남들에게 공유된(Shared) 사진을 모아보는 탭 분리.
- **좋아요(Like) 및 댓글(Comments)**: 다른 사람의 사진이나 내 사진에 좋아요 및 댓글 작성.
- **초대/공유 링크**: 특정 사진으로 바로 이동(Deep Link)할 수 있는 다이렉트 URL 복사 기능 (`.../#photo_id`).

### 📱 반응형 UI (Responsive Experience)
- PC 화면에서는 좌측 지도, 우측 패널 형태 (사이드바 폴딩 지원).
- 모바일 화면에서는 지도를 배경으로 깔고, 하단에서 스와이프업(Swipe-up)하여 올리는 드래그 핸들 방식(Bottom Sheet UI) 적용.

---

## 4. 파일 및 폴더 구조 (Directory Structure)

```text
practice_week1/
├── index.html           # 메인 페이지 (지도 영역, 사이드바, 상세 패널)
├── login.html           # 로그인/회원가입 페이지
├── style.css            # 메인 페이지 및 구조/지도 테마 스타일링
├── login.css            # 로그인 화면 전용 스타일 적용 (배경 슬라이더 등)
├── main.js              # 프로젝트 핵심 프론트엔드 비즈니스 로직 (지도, 이벤트, UI 등)
├── auth.js              # Supabase 초기화 및 Auth/DB/Storage 헬퍼 모듈
├── .gitignore           # Git 추적 제외 관리 (IDE 파일, Mac DS_Store 등 방지)
└── images/              # 애플리케이션에 필요한 로컬 정적 이미지 (로고, 스플래시 배경)
```

> **[주요 파일 상세 역할]**
> - **`auth.js`**: `supabase` 인스턴스를 초기화하고, `fetchPhotos`, `upsertPhoto`, `uploadImage` 등 외부와의 통신(API)을 래핑(Wrapping)해두었습니다. (데이터 레이어)
> - **`main.js`**: UI 렌더링, 이벤트 리스너(클릭, 드래그 등), 지도(Leaflet) 객체 제어를 담당합니다. (프레젠테이션/컨트롤 레이어)

---

## 5. 데이터베이스 스키마 구조 예상 (Supabase)

프로젝트 코드(`auth.js` 및 `main.js`)를 바탕으로 추론된 핵심 DB 테이블입니다. (실제 Supabase 대시보드와 대조 필요)

**1. `photos` 테이블**
- `id` (String 또는 UUID, Primary Key)
- `url` (String, Storage 퍼블릭 URL)
- `date` (String/Date, 촬영일 또는 업로드일)
- `title` (String, 제목)
- `description` (Text, 설명)
- `lat` (Float, 위도)
- `lng` (Float, 경도)
- `liked` (Integer, 좋아요 개수)
- `shared` (Boolean, 커뮤니티 공개 여부)
- `owner_id` (String/UUID, 작성자 식별자)

**2. `comments` 테이블**
- `id` (UUID, Primary Key)
- `photo_id` (String, 연관된 사진 ID)
- `text` (Text, 댓글 내용)
- `date` (Timestamp, 작성 시간)
- `author_id` (String/UUID, 작성자 식별자)

---

## 6. 협업 파이프라인 (Git Workflow)

현재 프로젝트는 안전한 배포 방식(Git Flow)을 따릅니다.

1. **개발(dev) 과정**: 언제나 코드는 `dev` 브랜치에서 먼저 수정 및 테스트합니다. (현재 로컬 작업 공간의 기본 브랜치)
2. **테스트 푸시**: 로컬에서 작업을 마치면 `git add .`, `git commit -m "작업 내용"`, `git push origin dev` 명령으로 `dev` 브랜치에 코드를 올립니다.
3. **제품 배포(main)**: `dev` 브랜치에서 충분히 검증이 끝나면 `main` 브랜치로 병합(Merge)한 뒤 실 서비스에 반영합니다.

동료 개발자는 아래 명령어로 환경을 세팅할 수 있습니다.
```bash
git clone https://github.com/hansokchun/practice_week1.git
cd practice_week1
git checkout dev  # 필수: dev 환경에서 작업 시작
```
