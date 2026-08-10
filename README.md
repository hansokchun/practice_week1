# Ikkyee

사진의 촬영 시각과 장소를 여행 기록으로 정리하고, 공개한 기록을 다른 사용자와 발견하는 반응형 웹 서비스입니다.

## 현재 기능

- 이메일, Google, Kakao 로그인과 신규 가입
- 공통 기본 프로필, 프로필 사진·닉네임 편집, Kakao 프로필 선택 적용
- 사진 업로드, EXIF 촬영일·위치 읽기, 브라우저 이미지 최적화
- 위치가 없는 사진의 Google Maps 수동 지정과 위치 공개 정밀도 설정
- 개인 사진 보관함, 앨범 작성·수정·공유
- Explore 공개 사진 지도, 사진 상세, 댓글, 좋아요, 좋아요 모음
- 데스크톱·모바일 반응형 화면과 키보드 사용 가능한 모달

## 기술 구성

- Vite 8 + Vanilla JavaScript + CSS
- Supabase Auth, Postgres, Row Level Security, Storage
- Google Maps JavaScript API
- Cloudflare Pages 및 Pages Functions
- `node:test` 기반 단위·소스 계약·릴리스 검사

## 로컬 실행

```bash
npm install
npm run dev
```

기본 개발 주소는 Vite가 출력합니다. Google Maps 키는 Cloudflare의 `/api/config` 또는 로컬 런타임 설정으로 주입하며, Supabase 서비스 역할 키와 공급자 비밀 키는 브라우저 코드에 넣지 않습니다.

## 검증

```bash
npm test
npm run build
npm run perf:budget
npm run release:rehearse
```

DB 백업·복구와 스토리지 전환 검사는 다음 명령을 사용합니다.

```bash
npm run backup:check
npm run backup:db
npm run restore:check
npm run restore:db
npm run storage:preflight:check
```

## 배포 흐름

1. `dev`에서 개발하고 전체 검증을 수행합니다.
2. `origin/dev`에 푸시하면 Cloudflare Pages 개발 배포가 갱신됩니다.
3. 개발 사이트를 확인한 뒤 검증된 커밋을 `main`으로 올립니다.
4. `origin/main` 푸시가 Cloudflare Pages 운영 배포를 갱신합니다.

수동 배포 명령은 `npm run cf:deploy:dev`, `npm run cf:deploy:main`입니다. 브랜치별 절차와 운영 체크는 [배포 문서](docs/operations/)를 따릅니다.

## 주요 경로

```text
index.html             앱 셸과 정적 화면 마크업
style.css              전체 반응형 스타일
auth.js                Supabase Auth·DB·Storage 경계
js/app.js              라우팅, 상태, 화면 렌더링, 이벤트 조정
js/*.mjs               테스트 가능한 기능별 헬퍼
functions/api/         Cloudflare Pages Functions
supabase/migrations/   순서대로 적용하는 DB 변경
test/                   Node 테스트
docs/spec.md            현재 제품 명세
docs/audits/            전체 검수 결과와 화면 증거
```

현재 출시 전 기준과 데이터 정책은 [서비스 명세](docs/spec.md), 최신 전체 검수 결과는 [2026-08-10 서비스 감사](docs/audits/full-service-audit-2026-08-10.md)에서 확인할 수 있습니다.
