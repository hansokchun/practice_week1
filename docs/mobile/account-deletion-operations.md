# 모바일 계정 삭제 운영 계약

**검증일:** 2026-08-25  
**범위:** 모바일 사용자의 영구 계정 삭제와 연결 데이터 정리

## 사용자 확인

- 프로필 설정에서 삭제 경고를 먼저 펼친 뒤 정확히 `계정 삭제`를 입력해야 영구 삭제 버튼이 활성화된다.
- 앱을 다시 설치하지 않아도 `https://practice-week1-cws.pages.dev/account-deletion/`에서 웹 로그인 후 같은 삭제 절차를 시작할 수 있다.
- 경고는 프로필, 클라우드 사진, 기존 웹 앨범, 댓글과 Storage 파일이 영구 삭제되며 복구할 수 없음을 명시한다.
- 기기 사진 앱의 원본 사진은 삭제하지 않는다. 앱이 만든 백업 제외 SQLite 행과 썸네일·게시용 임시 파생본만 먼저 지운다.

## 서버 삭제 순서

`delete-account` Edge Function은 앱이 넘긴 사용자 ID를 신뢰하지 않고 Bearer access token을 `auth.getUser(accessToken)`으로 검증한다. 본문은 고정된 `DELETE_ACCOUNT` 확인값만 받고, service-role 키는 Edge Function 환경 밖으로 노출하지 않는다.

1. `photos`, `avatars` 버킷의 `<auth-user-id>/` 경로를 목록화하고 모든 객체를 삭제한다. Auth 사용자가 Storage 객체를 소유한 채로는 hard delete가 거부될 수 있으므로 이 단계가 항상 먼저다.
2. 신고·차단, 작성 댓글, 좋아요, 소유 사진, 기존 웹 앨범, 프로필 행을 외래 키 순서에 맞춰 삭제한다. 사진에 매달린 위치·앨범 연결·댓글은 기존 cascade 계약을 따른다.
3. 연결 데이터 정리가 모두 성공한 뒤에만 `auth.admin.deleteUser` hard delete를 실행한다. 이로써 refresh token과 서버 session의 추가 사용을 종료한다.
4. 앱은 로컬 세션을 지우고 첫 화면으로 이동한다.

웹은 동일한 Edge Function을 호출한 뒤 브라우저의 로컬 Supabase 세션을 지우고 로그인 화면으로 이동한다. 앱과 웹 모두 사용자 ID나 service-role 키를 요청 본문에 넣지 않는다.

각 외부 작업의 오류는 다음 단계로 넘기지 않고 503으로 종료한다. Storage와 행 삭제는 없는 대상에 다시 실행해도 성공하는 멱등 흐름이므로, 사용자는 같은 확인 화면에서 재시도할 수 있다. 클라이언트와 응답은 원시 DB·Storage 오류를 표시하지 않는다.

## 세션과 운영 주의

- Supabase Auth hard delete 이후에는 refresh token을 더 이상 쓸 수 없지만, 이미 발급된 access JWT는 최대 만료 시각까지 암호학적으로 유효할 수 있다. 현재 로컬·운영 설정의 `jwt_expiry` 상한은 3,600초다.
- 민감한 Edge Function은 `auth.getUser` 재검증을 사용하므로 삭제된 사용자는 즉시 거부된다. Data API의 새 소유 행 작성은 `auth.users` 외래 키와 RLS로 실패한다.
- 삭제 성공 후 재복구는 제공하지 않는다. 삭제 실패 문의는 운영자가 Edge Function·Auth·Storage 로그의 시각과 상태 코드만 조회하고, 이메일·객체 경로·원문 콘텐츠를 새 운영 로그에 남기지 않는다.

## 검증 절차

`npm --prefix mobile run supabase:account-deletion:verify`는 로컬 Supabase에 삭제 대상과 비교 사용자를 만든 뒤 다음을 실제 요청으로 확인하고 fixture를 정리한다.

- 인증 없음 401, 잘못된 확인값 400, 정상 삭제 200
- 대상의 Auth 사용자, 프로필, 사진, 기존 웹 앨범, 교차 사진 댓글, 좋아요가 모두 제거됨
- 대상의 `photos`·`avatars` 객체가 제거됨
- 비교 사용자의 프로필·사진·Storage 객체는 유지됨

운영 Supabase에 마이그레이션과 Edge Function을 배포한 뒤에는 실제 테스트 계정으로 동일한 검증을 한 번 더 실행하고, 성공 전에 스토어 출시 준비로 판정하지 않는다.

2026년 8월 30일 운영 프로젝트에 `delete-account` version 1을 Supabase MCP로 배포해 `ACTIVE` 상태, 허용된 dev origin의 OPTIONS 204와 미인증 POST 401을 확인했다. 기존 사용자 데이터는 건드리지 않았으며, 일회용 테스트 계정의 정상 삭제 200 검증은 별도 출시 관문으로 남긴다.

## 공개 URL

- 개인정보 처리방침: `https://practice-week1-cws.pages.dev/privacy/`
- 지원: `https://practice-week1-cws.pages.dev/support/`
- 계정 삭제 안내: `https://practice-week1-cws.pages.dev/account-deletion/`

세 페이지는 배포 가능한 초안이다. 운영자가 공개 지원 이메일과 최종 정책 문구를 승인하기 전에는 검색엔진 색인을 막고 스토어 제출 URL로 확정하지 않는다.
