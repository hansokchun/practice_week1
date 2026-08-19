---
slug: mobile-app-local-photo-library
status: plan-ready-prototype-pending
intent: clear
review_required: false
plan_path: .omo/plans/mobile-app-local-photo-library.md
pending-action: execute task 1 prototype and record separate visual approval before app implementation
approach: React Native + Expo Development Build 기반 앱을 Explore 중심으로 구성한다. 기존 Supabase 계정·프로필·공개 사진·좋아요·댓글은 공유하고 기기 사진은 보조 기능으로 제공하되, 앨범 기능은 모바일 앱에서만 완전히 제외하며 웹은 변경하지 않는다.
---

# Draft: mobile-app-local-photo-library

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
| C1 | iOS/Android 앱 셸, 내비게이션, 디자인 토큰, 오류/로딩 상태 | active | `index.html`, `style.css`, `js/app-sections.mjs` |
| C2 | Supabase 인증과 프로필을 웹과 동일 계정/정책으로 공유 | active | `auth.js:112-272`, `docs/spec.md:23-30` |
| C3 | 기기 사진 권한, 자산 인덱싱, EXIF/GPS, 썸네일, 변경 감지 | active | 신규 모바일 네이티브 경계; PhotoKit/MediaStore 공식 API 필요 |
| C4 | 보조 탭의 로컬 사진 보관함, 지도, 상세, 위치 편집 | active | `docs/spec.md:32-39`, 웹 Home/Myphoto 기능 |
| C5 | 공개 전환 시 명시적 클라우드 업로드와 웹/앱 공용 사진 모델 | active | `auth.js:283-448`, `docs/spec.md:41-56` |
| C6 | 앱 기본 화면인 Explore, 공개 프로필, 좋아요, 댓글, 공유 링크 | active | `docs/spec.md:15-21`, `docs/spec.md:41-48` |
| C7 | 성능, 개인정보, 권한 회수/원본 삭제 복구, 실제 기기 QA, 스토어 출시 | active | `docs/spec.md:58-79` |
| C8 | 공개 업로드 outbox, 멱등성, 임시 파일 정리, 클라우드 보상 트랜잭션 | active | `auth.js:302-448`, `auth.js:645-716` |
| C9 | 계정 삭제, 신고·차단·운영자 조치, 개인정보/스토어 준수 | active | Apple/Google 출시 정책과 기존 공개 UGC 표면 |
| C10 | 웹·앱 공용 스키마/RLS/Storage 호환성과 순차 출시 | active | `supabase/schema.sql`, `docs/spec.md:66-72` |

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
| 앱 기술 | React Native + Expo Development Build + TypeScript | 기존 JavaScript 지식과 Supabase 호환성을 재사용하면서 PhotoKit/MediaStore 네이티브 접근 가능 | yes, early only |
| 출시 플랫폼 | iOS와 Android 동시 지원 | 요청이 특정 OS로 제한되지 않았고 데이터/권한 설계를 처음부터 공통화하는 편이 저렴함 | yes, schedule impact |
| 원본 저장 | 기기 사진 라이브러리만 사용; 앱 서버에 자동 백업 금지 | 서버 저장비를 사용자 기기에 두려는 핵심 요구 | no, product invariant |
| 로컬 메타데이터 | SQLite에 기기 asset ID, 시간, 위치, 회전, 동기화 상태 저장 | 재실행 시 전체 스캔과 UI 지연을 피함 | yes |
| 썸네일 | OS 썸네일 API와 앱 캐시 사용, 원본 복제 금지 | 빠른 그리드/지도 표시와 저장공간 절충 | yes |
| 변경 감지 | 최초 인덱싱 후 foreground/resume 증분 동기화; Android 비증분 이벤트는 제한적 재스캔 | 모바일 OS 제약 안에서 삭제/추가를 안정적으로 반영 | yes |
| 삭제/권한 회수 | 원본 삭제는 unavailable 처리 후 관계/핀 정리; 권한 회수는 삭제로 확정하지 않음 | 데이터 손실 오판과 앱 오류 방지 | no |
| 공개 | 사용자가 공개를 선택한 사진만 최적화 후 Supabase Storage/DB에 복제 | 웹/타 기기 공개 기능은 서버 사본 없이는 불가능 | no |
| 테스트 | 도메인/동기화 로직 TDD, 네이티브 UI tests-after, iOS/Android 실제 기기 시나리오 QA | 위험이 큰 상태 전이를 자동화하면서 UI 개발 속도 유지 | yes |
| 로컬 사용 계정 경계 | 로컬 보관함은 로그인 없이 기기 단위로 사용하고, 클라우드 기능만 로그인 요구 | 원본과 로컬 메타데이터는 Supabase 계정 소유 데이터가 아니며 로그아웃으로 사라지면 안 됨 | yes |
| 클라우드 범위 | 기존 private/link/public 클라우드 사진은 앱에서 관리; 새 로컬 사진은 명시적 클라우드 저장에서만 private/link/public 중 선택 | 웹 기능 동등성과 서버 자동 저장 금지를 함께 만족 | yes |
| 앨범 경계 | 모바일은 로컬·클라우드·공개 앨범을 조회하거나 변경하지 않으며 웹의 기존 앨범은 그대로 유지 | 앱 범위만 줄이고 웹 기능과 데이터 호환성을 보호 | no |
| 삭제 의미 | 기기 원본 삭제와 클라우드 사본 삭제를 별도 명령으로 표시; 기기 삭제는 이미 공개된 사본을 삭제하지 않음 | 데이터 손실과 사용자 오해 방지 | no |
| 기본 정보 구조 | 하단 `Explore · 내 사진 · 좋아요`; 앱 실행 시 Explore 진입; 프로필은 상단 오른쪽 원형 썸네일로 진입 | Explore를 주 기능으로 유지하면서 프로필 탭이 차지하던 하단 공간을 줄임 | yes, early only |
| 미디어 범위 | v1은 정지 사진 JPEG/PNG/WebP/HEIC; HEIC는 공개 시 호환 포맷 파생본 생성, Live Photo는 대표 정지 이미지, RAW/동영상 제외 | 일반 휴대폰 사진을 지원하면서 첫 출시 범위 통제 | yes |

## Findings (cited - path:lines)
- 웹의 현재 핵심 흐름에는 여행 앨범이 포함되지만, 모바일은 Explore·공개 사진 상호작용·개인 사진 보조 기능만 옮기고 앨범은 의도적으로 제외한다 (`docs/spec.md:7-21`).
- 사진 공개 범위는 `private|link|public`, 위치 공개 정밀도는 `exact|approximate|hidden`이며 비공개 원본 좌표는 RLS 보호 테이블에 둔다 (`docs/spec.md:32-48`).
- 웹은 단일 Supabase 사용자에 연결된 공급자들이 사진·앨범·좋아요를 공유한다 (`docs/spec.md:23-30`). 앱도 동일 프로젝트와 user id를 쓰되 `albums`와 `album_photos`에는 접근하지 않는다.
- 현재 데이터 경계에는 `albums`, `album_photos`도 존재하지만 모바일 구현 범위는 `profiles`, `photos`, `comments`, `user_likes`와 Storage로 제한한다 (`auth.js:18-24`, `auth.js:224-716`).
- 클라우드 사진은 15분 signed URL로 hydration되고 소유자 원본 위치는 별도 조회된다 (`auth.js:51-105`). 기기 사진은 이 URL 모델과 섞지 말고 `source=device|cloud` 어댑터 뒤에서 통합해야 한다.
- Home/Myphoto는 하나의 Home 해시를 공유하고 Explore만 독립 상위 섹션이다 (`js/app-sections.mjs:1-35`). 모바일은 Explore를 첫 탭으로 두고 하단을 `Explore · 내 사진 · 좋아요`로 재구성하며, 프로필은 각 주요 화면 상단 오른쪽 썸네일에서 연다.
- 기존 웹 품질 게이트는 동작 계약 테스트, 빌드, 성능 예산과 실제 모바일 OAuth/업로드/지도/공개 범위 QA를 요구한다 (`docs/spec.md:58-79`).
- 플랫폼 제약상 iOS 제한 사진 접근에서는 일부 자산만 보이며 사용자 앨범 접근도 제한될 수 있다. Android에서는 광범위 사진 권한이 Play 정책 심사 대상이고, MediaStore 변경 알림이 항상 증분 ID를 주지는 않는다.

## Decisions (with rationale)
- 사용자는 2026-08-19에 모바일 앱만 Explore 중심으로 만들고, 내 사진 정리는 보조 기능으로 두며, 여행 앨범 기능은 완전히 제외하기로 범위를 수정했다. 이후 프로필은 하단 탭이 아니라 상단 프로필 썸네일로 열도록 결정했다. 기존 웹은 변경하지 않는다.
- 공통 클라우드 데이터와 기기 전용 데이터를 하나의 레코드로 억지로 합치지 않고, UI 도메인 모델에서 `source`로 통합한다. 로컬 asset ID는 기기 밖에서 유효하지 않기 때문이다.
- 로컬 사진의 서버 자동 업로드는 금지한다. 공개/공유를 누른 시점에만 용량 최적화, 메타데이터 검토, 위치 공개 정밀도 확인을 거쳐 클라우드 사진으로 생성한다.
- 기기에서 원본이 삭제되거나 접근 권한이 사라져도 앱이 크래시하지 않도록 `available|missing|permission-limited|cloud` 상태를 명시한다.
- 실시간 백그라운드 감시는 보장하지 않는다. 앱 실행/복귀 시 신속하게 동기화하고, 화면에는 인덱싱 진행률과 마지막 동기화 상태를 제공한다.
- 화면 구현 전에 실제 iOS/Android 기기 기술 스파이크를 통과해야 한다. 제한/전체 권한, 페이지네이션, 변경 감지, GPS, iCloud 원본, 썸네일, 프로세스 재개를 검증하고 부족하면 최소 네이티브 모듈 경계를 먼저 확정한다.
- 원본은 durable app storage에 복제하지 않는다. 공개 파생본은 outbox가 관리하는 임시 파일이며 성공·실패·취소·재시작 후 정리한다.
- 공개 저장은 `queued|preparing|uploading|persisting|published|failed|cancelled` 상태와 멱등성 키를 갖고 Storage/DB 중간 실패를 복구한다.
- Google/Kakao를 유지하는 iOS 앱에는 Sign in with Apple을 추가하고, 계정 삭제와 공개 UGC 신고·차단·운영자 처리 경로를 출시 범위에 포함한다.
- 모바일 데이터 계층과 UI는 `albums`와 `album_photos`를 import·query·mutate하지 않는다. 웹 회귀 검증은 이 테이블과 기존 웹 앨범 화면이 변하지 않았음을 확인하는 용도로만 수행한다.

## Scope IN
- iOS/Android 앱 기반, 공용 디자인 시스템, 딥링크, 세션 복원.
- 이메일/Google/Kakao 인증, 비밀번호 복구, 프로필 조회·편집.
- 기기 사진 권한 요청, 전체/제한 접근, 인덱싱, 날짜/GPS 추출, 썸네일과 원본 보기.
- Explore 기본 진입, 공개 지도·목록·사진 상세, 좋아요, 댓글, 공개 프로필, 링크/Kakao 공유.
- 보조 탭의 로컬 사진 그리드, 지도, 상세, 위치 보정, 선택·삭제 반영.
- 기존 클라우드 사진 관리와 공개 정밀도 관리.
- 로컬 사진의 명시적 공개 업로드와 업로드 실패 보상/재시도.
- 대형 라이브러리 성능, 오프라인, 권한 회수, 외부 삭제, iCloud 원본 다운로드 지연 QA.

## Scope OUT (Must NOT have)
- 모바일의 여행 앨범 생성·조회·편집·삭제·공개·공유, 로컬 가상 앨범, 웹 앨범 관리.
- 기존 웹 코드·화면·라우팅·Supabase 앨범 테이블·웹 앨범 데이터를 변경하거나 삭제하는 작업.
- 사용자의 동의 없는 기기 원본 또는 전체 라이브러리 서버 업로드.
- 기기 전용 사진을 웹이나 다른 기기에서 볼 수 있다고 오인시키는 UI.
- 앱이 꺼진 동안 모든 OS에서 실시간 사진 변경을 보장하는 기능.
- 기기 원본 삭제 시 자동 복구 또는 서버 백업을 약속하는 기능.
- 서비스 역할 키나 OAuth 비밀 키를 모바일 번들에 포함.

## Open questions
- 없음. 사용자가 모바일 전용 Explore 중심 구조와 앨범 제외, 웹 비변경 조건을 명시했다.

## Approval gate
status: scope-approved
scope_approved_at: 2026-08-19
approved_scope: Explore-first mobile app, three bottom tabs, profile opened from top thumbnail, personal photos as secondary, no mobile album features, protected browser-app paths unchanged
prototype_approval: pending task 1 clickable prototype
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
