# 모바일 백엔드 환경 분리

**작성일:** 2026-08-25  
**적용 범위:** Expo 로컬 개발, EAS Preview, EAS Production

## 고정 계약

| 앱 환경 | EAS environment | 허용 Supabase | 목적 |
| --- | --- | --- | --- |
| `development` | `development` | loopback·사설 IP의 로컬 Supabase | 로컬 개발·자동 검증 |
| `preview` | `preview` | 운영 ref와 다른 `https://<ref>.supabase.co` | 내부 테스트·미리보기 |
| `production` | `production` | `https://pqczcponriukilrtpbdl.supabase.co` | 웹과 공유하는 운영 계정·사진 |

`mobile/eas.json`은 세 build profile에 각각 같은 이름의 EAS environment와 `EXPO_PUBLIC_APP_ENV`를 명시한다. 앱은 시작 시 URL과 환경 조합을 검증하며 다음 오연결을 거부한다.

- development 빌드의 원격·운영 Supabase 연결
- preview 빌드의 HTTP, 로컬, 운영 ref 연결
- production 빌드의 로컬, preview ref, 임의 port 연결
- preview·production의 legacy anon key fallback
- 모든 환경의 service-role·secret 형태 키

## EAS에 등록할 공개 클라이언 값

각 environment에 아래 두 값을 등록한다. 두 값은 앱 번들에 포함되는 공개 클라이언 설정이며 비밀값으로 간주하지 않는다. 단, 로그에 불필요하게 반복 출력하지 않는다.

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`EXPO_PUBLIC_APP_ENV`는 `eas.json`에서 profile과 같은 값으로 고정된다. service-role, secret key, OAuth client secret는 EAS의 `EXPO_PUBLIC_` 변수나 앱 소스에 절대 넣지 않는다.

## 남은 외부 관문

1. 운영과 분리된 Preview Supabase 프로젝트를 생성하고 스키마·RLS·Storage·Edge Function을 승인된 방식으로 적용한다.
2. Expo/EAS 프로젝트의 development·preview·production environment에 공개 URL·publishable key를 등록한다.
3. 각 profile의 서명 빌드에서 예상 project ref와 Auth·RLS·Storage 왕복을 재검증한다.

이 외부 관문을 통과하기 전에는 출시 체크리스트의 환경 분리 항목을 완료로 간주하지 않는다.
