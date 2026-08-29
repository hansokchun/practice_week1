# 모바일 계정 연결 정책

## 결정

- 대표 Ikkyee 프로필의 경계는 OAuth 공급자 이메일이나 `user_metadata`가 아니라 Supabase Auth 사용자 ID다.
- 같은 검증 이메일로 새 OAuth 로그인을 하면 Supabase Auth의 자동 identity linking 결과를 사용한다. 앱이 이메일 문자열만 비교해 사용자나 프로필 행을 합치지 않는다.
- 다른 이메일 또는 이메일을 제공하지 않는 Kakao 계정은 이미 로그인된 사용자가 프로필의 `로그인 방법`에서 명시적으로 연결한다.
- 수동 연결은 Google·Kakao만 제공하고, 현재 앱에서는 연결 해제를 제공하지 않는다. 최소 두 identity 조건만으로는 사용자가 실제로 다시 로그인할 방법이 남는지 보장할 수 없기 때문이다.
- 연결 전후의 서버 검증 사용자 ID가 다르면 현재 기기의 새 세션을 즉시 폐기하고 프로필·사진 요청을 진행하지 않는다.
- 공급자 원시 오류, identity ID, access token은 화면과 로그에 노출하지 않는다.

## 구현 경계

- `mobile/src/account-identity-linking.ts`: identity 목록 정규화, `linkIdentity`, PKCE 콜백, 사용자 ID 불변 검증
- `mobile/src/AccountIdentitySection.tsx`: 연결 상태와 명시적 Google·Kakao 연결 UI
- `mobile/app/profile.tsx`: 로그인된 대표 프로필에 설정 화면 연결

프로필·사진·좋아요·댓글은 모두 기존 `auth.uid()` 소유권을 사용하므로 연결 성공 후 별도 데이터 복사나 병합 SQL을 실행하지 않는다. 사용자 입력 가능한 `user_metadata`는 권한 결정에 사용하지 않는다.

## 출시 전 외부 관문

1. 운영·preview Supabase Auth 설정에서 **Enable Manual Linking**을 켠다.
2. Google·Kakao 공급자와 `ikkyee://auth/callback` 리디렉션을 등록한다.
3. 기존 이메일 계정에서 Google·Kakao를 각각 연결하고, 연결 전후 `user.id`와 대표 `profiles` 행이 동일한지 확인한다.
4. 이미 다른 사용자에 연결된 identity, 취소, 공급자 거부, 네트워크 중단을 서명된 iOS·Android 빌드에서 확인한다.
5. Supabase의 identity link/unlink 보안 알림 이메일 기능 사용 여부를 운영 정책과 함께 승인한다.

이 관문 전에는 출시 체크리스트의 계정 연결 전체 흐름과 대표 프로필 검증 항목을 완료로 전환하지 않는다.

## 공식 근거

- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase JavaScript `linkIdentity`](https://supabase.com/docs/reference/javascript/auth-linkidentity)
- [Supabase Auth security-sensitive email notifications](https://supabase.com/changelog/40349-notify-users-about-security-sensitive-actions-on-their-accounts)
