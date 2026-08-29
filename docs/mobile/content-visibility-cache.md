# 웹·모바일 콘텐츠 공개 상태와 캐시 계약

**검증일:** 2026-08-25  
**범위:** 같은 Supabase 계정을 사용하는 웹·모바일 간 삭제·비공개·링크 해제 반영

## 공유 경계

웹과 모바일은 같은 Supabase Auth 사용자와 `profiles`, `photos`, `comments`, `user_likes`, `user_blocks`, `content_reports` 행을 사용한다. 기존 웹 `albums`도 같은 Auth 사용자에 소유되지만 모바일은 앨범 API를 제공하지 않는다.

기기 사진 앱의 원본, 원본 EXIF·정확 위치, 백업 제외 SQLite 인덱스, 썸네일과 임시 게시 파생본은 웹과 공유하지 않는다.

## 서버 공개 상태

- Explore, 공개 사진 상세, 공개 프로필, 내 프로필 요약은 매 조회마다 `photos.visibility = 'public'`인 행만 받는다.
- 좋아요 목록은 `user_likes` ID와 현재도 공개인 `photos` 행을 교차한다.
- 댓글은 대상 사진이 현재 보이는 경우만 RLS를 통과한다. 상세 사진 재검증이 실패하면 렌더링한 댓글도 함께 제거한다.
- 모바일 링크는 `private`, `shared = false`, 정확한 `link_token_hash` 조합일 때만 응답한다. 토큰 해시를 지우면 기존 토큰도 잘못된 토큰과 같은 404를 받는다.

## 화면 재검증

Explore, 좋아요, 공개 사진 상세·댓글, 공개 프로필, 내 프로필 공개 요약, 링크 수신 화면은 첫 진입, 재 focus, background/inactive에서 active로 복귀할 때 첫 페이지를 다시 읽는다.

재검증을 시작하면 이전 이미지·미리보기·댓글을 로딩 상태로 교체한다. 행이 사라졌거나 RLS를 통과하지 못하면 이전 서명 URL을 다시 렌더링하지 않는다. 삭제·비공개 여부와 원시 오류는 사용자에게 노출하지 않는다.

화면을 계속 열어 둔 경우에는 270초마다 행과 서명 URL을 재조회해 300초 만료 전에 교체한다. 화면이 focus를 잃거나 앱이 background/inactive가 되면 자동 갱신을 중지한다. 오프라인·네트워크 실패 시 서명 URL을 영구 캐시하지 않고 안전한 재시도 상태를 보여 재연결 후 현재 공개 범위를 다시 확인한다.

## 서명 URL과 CDN 한계

앱은 재검증 즉시 기존 URL을 버리지만 이미 발급된 Storage 서명 URL은 만료 전까지 유효할 수 있다. 현재 상한은 300초다. Supabase에 따르면 서명 URL 만료와 CDN TTL은 독립적이며, 즉시 차단은 Storage 객체 삭제를 포함해야 한다. 객체 삭제의 CDN 반영에도 최대 약 1분이 걸릴 수 있다.

- [Storage 다운로드와 서명 URL](https://supabase.com/docs/guides/storage/serving/downloads)
- [Smart CDN 캐시](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 검증

- `mobile/__tests__/content-visibility-refresh.test.tsx`와 각 화면 테스트: 재 focus·foreground, 이전 이미지·미리보기·댓글 제거
- `mobile/__tests__/content-visibility-refresh.test.tsx`: focus 중 270초 자동 재발급과 focus 해제 시 타이머 중지
- `mobile/scripts/verify-photo-storage-access.mjs`: 소유자 private 접근, 익명·비소유자 public 서명 조회, private 직접·서명 접근 거부, 1초 URL 만료, 공개 후 비공개 전환 검증
- `mobile/scripts/verify-like-policy.mjs`: 비공개 사진의 좋아요 목록 제외
- `mobile/scripts/verify-comment-policy.mjs`: 비공개 사진의 댓글 숨김
- `mobile/scripts/verify-mobile-link-policy.mjs`: 해제된 토큰 404와 정상 링크의 안전한 투영

운영 Supabase 배포·원격 역할 재검증 전에는 운영 출시 계약으로 간주하지 않는다.
