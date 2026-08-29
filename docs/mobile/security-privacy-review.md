# 모바일 출시 보안·개인정보 검토

검토일: 2026-08-26  
범위: 인증 리디렉션, 로컬 데이터, 로그, 공유 링크, Postgres RLS, Supabase Storage

이 문서는 현재 커밋 대상 코드와 빈 로컬 Supabase에 전체 마이그레이션을 재생한 결과를 근거로 한다. 운영 원격 프로젝트의 설정·마이그레이션 적용 여부나 서명 실기기 결과를 추정하지 않는다.

## 결론

코드 및 로컬 백엔드 보안·개인정보 검토는 통과했다. `npm run security:verify`가 아래 6개 경계를 정적으로 검사하고 CI에서도 실행된다.

1. 인증 리디렉션
2. 세션 및 로컬 데이터
3. 개인정보를 남기지 않는 로그
4. 비공개 공유 링크
5. RLS와 권한 함수
6. Storage 접근 경계

로컬 Supabase에서는 익명·인증 소유자·인증 비소유자 역할로 댓글, 좋아요, 신고·차단, 프로필, 사진·아바타 Storage, 비공개 링크, 계정 삭제를 실제 왕복했다. `supabase db lint --local --schema public --level warning --fail-on warning`과 `supabase db advisors --local --type security --level warn --fail-on warn`도 발견 0건으로 통과했다.

## 인증 리디렉션

- 허용 callback은 정확히 `ikkyee://auth/callback` 하나다. scheme, host, path, 사용자 정보와 port를 코드·토큰 소비 전에 검사한다.
- 이메일 가입·복구와 Google·Kakao OAuth가 같은 검증 함수를 사용한다.
- 공급자 authorization URL은 HTTPS만 허용한다. 로컬 개발에 한해 loopback HTTP를 허용하며 사용자 정보가 포함된 URL과 `javascript:` 등 다른 scheme은 브라우저로 열지 않는다.
- Supabase 클라이언트는 PKCE, `detectSessionInUrl: false`, 네이티브 SecureStore 세션 저장을 사용한다.
- callback의 공급자 `error_description`, 세션 교환 오류, 토큰은 화면이나 로그에 표시하지 않고 일반 복구 문구만 보여 준다.
- `raw_user_meta_data`는 신규 프로필의 표시 이름·아바타 초기값에만 쓰고 RLS 또는 권한 판단에는 사용하지 않는다.

검토 중 기존 callback이 정확한 origin/path를 먼저 검사하지 않고 공급자 오류 설명을 화면에 전달하는 문제를 발견해 수정했다. 공격자 HTTPS origin, 잘못된 custom-scheme host/path, 사용자 정보가 포함된 URL을 세션 API 호출 전에 거부하는 테스트를 추가했다.

## 로컬 데이터

- 네이티브 Supabase 세션은 Expo SecureStore에 1,800자 단위로 분할 저장하고 웹에서만 AsyncStorage를 사용한다.
- 사진 인덱스·EXIF/GPS·게시 작업은 Android no-backup-files 또는 iOS backup-excluded Application Support 하위의 검증된 경로만 허용한다.
- 썸네일과 게시 파생본은 cache 영역에 두며 계정 삭제·권한 철회·만료·시작 복구에서 제거한다.
- 계정 삭제는 앱 데이터만 정리하고 운영체제 사진 원본을 변경하지 않는다.
- Supabase Auth 사용자 삭제 뒤 이미 발급된 access token은 만료까지 암호학적으로 유효할 수 있다. 삭제된 사용자의 서버 행·Storage 객체·Auth 사용자 및 session은 제거되고 사용자 소유 쓰기는 Auth 외래 키로 닫힌다. 운영 JWT 만료 설정 확인은 외부 관문에 남긴다.

## 로그

- `mobile/app`, `mobile/src`, `mobile/modules` 운영 소스에는 `console.debug/error/info/log/warn` 호출이 없다.
- 출시 유출 감사는 access token, session, password, Storage path, 좌표 관련 로그와 정밀 좌표 상수를 탐지하며 일치 값 자체는 출력하지 않는다.
- 테스트 도구는 고정된 가상 UUID와 `example.invalid` 이메일만 사용하고 운영 원격 사용자 데이터는 읽지 않는다.
- 오류 화면은 Supabase·OAuth·Storage 원시 오류, 내부 경로, SQL 내용을 표시하지 않는다.

## 공유 링크

- 원문 256-bit 토큰은 HTTPS URL fragment 또는 development custom scheme에만 존재한다. Postgres에는 SHA-256 해시만 저장한다.
- Cloudflare 요청 URL·Referrer에 fragment가 전송되지 않으며 fallback은 `no-store`, `no-referrer`, CSP를 사용한다.
- Edge Function은 64자 hex 토큰만 받고 해시로 private/unshared 행을 찾은 뒤 300초 signed URL과 최소 사진 투영만 반환한다. 정확 좌표, Storage path, 토큰·해시는 반환하지 않는다.
- 잘못된·만료·해제 토큰은 동일한 404 범위로 처리한다.
- 로컬 검증 도구는 fixture 객체·행만 지우고 영구 `photos` 버킷을 삭제하지 않는다. 검토 중 발견한 버킷 삭제 cleanup 결함을 수정했다.

## RLS

- 공개 스키마의 `profiles`, `photos`, `photo_private_locations`, `comments`, `user_likes`, `user_blocks`, `content_reports`에 RLS가 활성화돼 있다.
- 소유자 쓰기는 `auth.uid()`와 행의 소유자 열을 비교하며 UPDATE는 `USING`과 `WITH CHECK`를 함께 둔다.
- `auth.role()` 또는 사용자 편집 가능한 metadata 기반 권한 판단을 사용하지 않는다.
- `SECURITY DEFINER` 및 트리거 함수는 `search_path`를 고정하고 PUBLIC 실행을 회수한다. 앱이 호출하는 `set_photo_like`만 `authenticated`에 명시적으로 허용하고 함수 내부에서 `auth.uid()`와 사진 가시성을 다시 검사한다.
- 로컬 역할 테스트에서 비소유 private 읽기·쓰기, 익명 RPC 실행, 다른 사용자 댓글 삭제, 신고 조회, 차단 데이터 교차 접근을 거부했다.

## Storage

- `photos` 버킷은 private이고 객체 경로 첫 구간과 `owner_id`가 현재 `auth.uid()`와 모두 일치해야 업로드·수정·삭제할 수 있다.
- 익명·비소유자는 현재 public/shared 사진과 연결된 객체에 대해서만 signed URL을 받을 수 있다. private 전환 뒤 새 signed URL 발급은 거부된다.
- `avatars`는 공개 표시용 버킷이지만 업로드·삭제는 소유자 UUID 경로, JPEG MIME, 2MiB 제한을 적용한다.
- 비소유 Storage DELETE는 API 버전에 따라 오류 대신 성공 형태와 0개 처리로 응답할 수 있다. 따라서 테스트는 오류 모양이 아니라 삭제 시도 후 소유자가 같은 객체를 다시 서명·다운로드할 수 있는지 확인한다.
- 업로드는 기본 `upsert: false`이며 의도적 교체가 아닌 쓰기에 UPDATE 권한을 암묵적으로 요구하지 않는다.

## 검증 명령

```text
cd mobile
npm run security:verify
npm run audit:release
npm run supabase:comment-policy:verify
npm run supabase:content-safety:verify
npm run supabase:link-policy:verify
npm run supabase:like-policy:verify
npm run supabase:profile-policy:verify
npm run supabase:profile-storage:verify
npm run supabase:photo-storage:verify
npm run supabase:account-deletion:verify
npx supabase db lint --local --schema public --level warning --fail-on warning --workdir ..
npx supabase db advisors --local --type security --level warn --fail-on warn --workdir ..
```

## 남은 외부 관문

- 운영 원격 Supabase migration history와 저장소 정책을 대조하고 승인된 마이그레이션을 적용한 뒤 같은 역할 테스트를 다시 실행한다.
- Auth JWT expiry, 유출 비밀번호 보호, 이메일·OAuth redirect allow-list와 공급자 설정을 운영 Dashboard에서 확인한다.
- Apple Team ID·Android 출시 서명 지문을 association endpoint에 등록하고 서명 실기기에서 인증·공유 링크를 확인한다.
- 운영 책임자·지원 채널과 개인정보 처리방침을 승인한다.

위 항목은 배포·계정 권한이 필요한 출시 관문이며 이번 로컬 코드 검토의 통과 여부와 분리한다.

## 공식 기준

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase user sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase user deletion](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase changelog breaking changes](https://supabase.com/changelog?types=breaking-change)
