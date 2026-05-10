# Orchestration

## Git Workflow & Branch Management Rule
1. **Auto-Push to `dev` ONLY**: Whenever you make local changes and commit them, you MUST push ONLY to the `origin dev` branch.
2. **`main` is Manual**: DO NOT push, merge, or modify the `main` branch unless explicitly instructed by the USER.

*This rule is persistent and dictates the execution process across all sessions.*

## Update History

### [2026-05-10] 지도 UX 및 전역 상태 유지(State Management) 고도화
1. **지도 시점(Viewport) 애니메이션 버그 수정**: 
   - 위치 보기 중 사이드바 크기가 변할 때, Leaflet의 `panTo` 애니메이션이 취소되어 마커가 가려지는 현상 발생.
   - `setView(..., { animate: false })`를 사용하여 리사이징과 충돌 없이 지도가 즉시 마커 위치로 이동하도록 수정.
2. **새로고침 시 현재 페이지(상태) 복원 기능**: 
   - 사용자가 어느 탭이나 앨범, 프로필, 사진 상세페이지에 있든 새로고침 시 원래 위치로 돌아가도록 `sessionStorage` 기반 상태 저장 로직 추가.
   - 공유 링크 등을 타고 오는 경우를 대비해 기존의 URL 해시(딥 링크) 방식은 Fallback으로 통합.
3. **지도 핀(마커)과 사이드바 그리드 동기화**: 
   - 내 피드, 커뮤니티 피드, 개별 유저 프로필, 특정 앨범 등 사이드바에 현재 노출된 사진 목록과 정확히 일치하는 데이터만 지도에 마커로 표시되도록 필터링 로직 수정.
