# Maestro 출시 기본 동작 검증

## 범위

`mobile/maestro/explore-smoke.yaml`은 `com.ikkyee.mobile` 독립 개발·preview·production 빌드에서 실행하는 계정 독립 smoke flow다. Expo Go에서는 사용자 정의 app ID를 직접 실행하지 못하므로 이 흐름을 Expo Go 통과 근거로 대체하지 않는다.

흐름은 다음을 확인한다.

1. 앱 상태를 초기화하고 모든 선택형 런타임 권한을 거부한 상태로 시작한다.
2. Explore 루트와 빈 장소 검색의 로컬 검증 오류를 확인한다.
3. `내 사진`으로 이동해 권한 거부 상태가 안전하게 안내되는지 확인한다.
4. `좋아요`, Explore, 프로필 화면의 핵심 이동을 확인한다.

테스트 계정, 이메일, 비밀번호, 토큰, 비밀 링크를 workflow나 환경 변수로 전달하지 않는다. `clearKeychain`은 iOS 기기의 전체 Keychain에 영향을 줄 수 있어 사용하지 않는다. 테스트는 전용 simulator·emulator 또는 초기화가 승인된 QA 기기에서만 실행한다.

## 실행

1. `com.ikkyee.mobile` 식별자의 standalone 빌드를 대상 기기에 설치한다.
2. Maestro CLI와 대상 simulator·emulator 또는 QA 기기 연결을 확인한다.
3. 저장소의 `mobile/`에서 `npm run maestro`를 실행한다.
4. iOS와 Android 결과를 각각 아래 형식으로 기록한다.

```text
플랫폼/OS:
기기 또는 simulator 등급:
앱 버전/빌드 번호:
빌드 profile/commit:
실행 시각:
결과:
실패 단계와 개인정보 제거 스크린샷 경로:
```

실패 증빙에는 계정 이메일, 사진, 정확한 위치, 링크 토큰, Storage URL을 남기지 않는다. 실패 시 사용자 데이터를 가진 실기기에서 무작정 `clearState`를 반복하지 않고 전용 QA 환경에서 재현한다.

## 완료 관문

- iOS standalone 빌드 1회 통과
- Android standalone 빌드 1회 통과
- workflow의 app ID와 빌드 식별자가 동일함을 확인
- 실패·재실행 로그에 개인정보나 자격 증명이 없음을 확인

이 네 관문 전에는 실제 빌드 Maestro 체크 항목을 완료 처리하지 않는다.

## 공식 근거

- [Maestro React Native 지원](https://docs.maestro.dev/platform-support/react-native)
- [Maestro `launchApp`](https://docs.maestro.dev/api-reference/commands/launchapp)
- [Maestro `assertVisible`](https://docs.maestro.dev/reference/commands-available/assertvisible)
