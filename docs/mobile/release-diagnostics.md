# 모바일 출시 진단 경계

**작성일:** 2026-08-30  
**현재 상태:** 외부 오류 보고 공급자 미연결, 앱 내부 복구·메모리 진단 기반만 활성화

## 현재 구현

- 루트 화면을 `AppErrorBoundary`로 감싸 예상하지 못한 렌더링 오류에도 안전한 재시도 화면을 제공한다.
- 오류 객체, 메시지, stack trace는 화면이나 진단 이벤트로 전달하지 않는다.
- 진단 이벤트는 허용된 오류 코드, 화면 구분, 심각도, 앱 버전, 플랫폼, 환경, 분 단위 시각만 담는다.
- 이벤트는 최대 50개를 메모리에만 유지한다. 앱 종료 시 사라지며 Supabase나 외부 공급자로 전송하지 않는다.
- 진단 sink가 실패해도 앱 복구 흐름을 막지 않는다.

## 의도적으로 수집하지 않는 것

- 이메일, 사용자 ID, OAuth identity, 토큰, 세션
- 사진 ID·URL·Storage 경로·제목·설명·태그
- 위도·경도, 검색어, 댓글, 신고 내용
- 원시 provider 오류, HTTP 응답 본문, stack trace

## 외부 공급자를 도입할 때의 관문

오류 보고 공급자는 운영자 승인, 개인정보 처리방침·스토어 표시 갱신, 데이터 보존 기간, 처리 지역, 삭제 절차를 먼저 확정한다. 승인 뒤에도 앱에서는 현재 allowlist 이벤트만 전송하며 공급자의 자동 사용자 식별·스크린샷·네트워크 body·breadcrumb 수집은 기본적으로 끈다. Preview에서 페이로드 검사를 통과하기 전 production DSN이나 토큰을 등록하지 않는다.

## 검증

```bash
cd mobile
npm test -- --runInBand __tests__/release-diagnostics.test.ts __tests__/app-error-boundary.test.tsx
npm run security:verify
```
