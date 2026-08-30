# 모바일 출시 화면 이동 계약

기준일: 2026-08-27

## 핵심 경로

- 랜딩 → 공개 사진 상세 → 공개 프로필 → 공개 사진 상세
- 랜딩 섹션 전체보기 → 지역 필터·점진 사진 목록 → 공개 사진 상세
- 랜딩 → Explore 지도 → 공개 사진 상세
- 랜딩 → 사진 추가 → 로그인 또는 내 사진 선택·게시 확인
- 랜딩 계정 메뉴 → 프로필·내 사진·좋아요한 사진
- 내 사진 → 기기 사진 상세 → 위치 편집 → 기기 사진 상세
- 내 사진 → 웹 앨범 목록 → 읽기 전용 앨범 상세 → 공개 가능한 사진 상세
- 내 사진 → 사진 선택 → 게시 확인 → 비공개·링크·공개 게시 결과
- 좋아요 → 공개 사진 상세; 비로그인 상태는 로그인으로 이동
- 비밀번호 재설정 콜백 → 새 비밀번호 → 프로필
- HTTPS fragment 또는 development custom scheme 토큰 사진 링크 → 독립 수신 화면 → 없음·만료·해제·네트워크 상태

## 라우트 소유권

| 표면 | 경로 | 접근 경계 |
| --- | --- | --- |
| 공개 랜딩·지도 | `/`, `/explore` | 둘 다 guest 허용; 랜딩은 웹과 같은 관리형 공개 사진 섹션을 조회 |
| 태그 전체보기 | `/tag/[sectionId]` | 공개 섹션 ID를 다시 조회하며 지도 없이 지역 필터와 점진 사진 격자를 제공 |
| 사진 추가·개인 메뉴 | `/upload`, `/my-photos`, `/likes` | 고정 하단 탭은 표시하지 않고 헤더 동작과 계정 메뉴에서 진입 |
| 웹 앨범 읽기 | `/albums`, `/album/[albumId]` | 인증 사용자의 소유 앨범과 RLS로 보이는 사진만 조회; 쓰기 동작 없음 |
| 계정 | `/profile`, `/auth/login`, `/auth/callback`, `/auth/update-password` | 세션 검증 후 프로필로 replace |
| 로컬 사진 | `/device-photo/[assetId]`, `/device-photo/[assetId]/location` | 로컬 SQLite·OS 사진 권한; 정확 좌표를 URL에 넣지 않음 |
| 게시 | `/publish/review` | 명시적 사진 선택과 목적을 params로 검증 |
| 공개 사진 | `/explore-photo/[photoId]`, `/public-profile/[userId]` | ID만 전달하고 공개 투영을 재조회 |
| 비밀 링크 | `/photo-link`, `/photo-link/[token]` | HTTPS는 서버 로그에 남지 않는 fragment를 검증하고 development custom scheme만 동적 경로를 사용 |

## 복귀 규칙

- 상세·편집·게시 확인의 닫기는 Expo Router stack의 `back`을 사용해 직전 목록·상세 상태로 돌아간다.
- Ikkyee 로고는 검색 상태를 초기화한 랜딩을 유지하고, 지도 진입은 `/explore` stack 화면을 연다.
- 로그인·콜백·비밀번호 완료는 `replace`를 사용해 민감한 중간 화면으로 뒤로 가지 않는다.
- 공개 상세·프로필은 보이는 행을 항상 다시 조회해 앱이 백그라운드에 있는 동안 비공개로 바뀐 캐시를 제거한다.
- 앱 계정 삭제 완료는 루트로 replace해 인증 화면 stack을 제거한다.

## 검증 범위

Automated coverage verifies route files, route constants, screen callbacks, guest/auth boundaries, dynamic parameter validation, HTTPS origin·fragment validation, generated iOS entitlement·Android intent filter, and the main end-to-end publication journey. It is not a real-device claim: Android 백 버튼, iOS swipe-back, universal/app-link OS verification, 앱 프로세스 종료 후 복귀는 서명된 실기기 빌드 관문에서 다시 확인한다.
