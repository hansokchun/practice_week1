# 모바일 네이티브 빌드 호스트 점검

**점검일:** 2026-08-30
**실제 기기:** 없음

## 확인 결과

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| iOS Simulator | 준비됨 | iOS 18.6 iPhone 16 simulator 부팅 확인 |
| CocoaPods | 준비됨 | Ruby 3.3.9 환경의 CocoaPods 1.16.2 설치 및 Pod 해석 확인 |
| Expo prebuild | 통과 | 임시 영문 경로에서 iOS native directory와 Pods 생성 성공 |
| iOS compile | 보류 | Xcode 16.4의 Swift 6.1.2보다 `expo-modules-jsi` 57.0.6이 선언한 Swift tools 6.2가 높음 |
| Android build | 보류 | Android SDK, emulator, `adb`가 현재 호스트에 없음 |
| 실제 기기 QA | 보류 | 연결된 iPhone·Android가 없음 |

## 발견한 경로 제약

현재 저장소의 한글 경로에서 CocoaPods가 Hermes compiler 경로를 `ASCII-8BIT`와 `UTF-8`로 혼합해 읽는 문제가 재현됐다. 저장소 코드를 바꾸지 않은 임시 영문 Git worktree에서는 Pods 설치가 통과했다. 네이티브 로컬 빌드는 영문 경로 worktree 또는 EAS Build를 사용한다.

## 다음 빌드 조건

1. Swift 6.2 이상을 제공하는 Xcode로 업데이트하거나 EAS Build를 사용한다.
2. 실제 제한된 Google Maps iOS·Android 키를 EAS environment에 등록한다.
3. Android는 SDK·emulator를 설치하거나 EAS Build로 대체한다.
4. 서명 빌드가 만들어진 뒤 TestFlight·Play 내부 테스트에서 실제 기기 QA를 진행한다.

이번 점검의 지도 키는 컴파일 경로 확인용 대체 문자열이었으므로 지도 표시 성공 근거로 사용하지 않는다. Swift tools 선언을 임시로 낮춘 시도도 Swift 6.2 문법에서 실패했으며 저장소 의존성은 수정하지 않았다.
