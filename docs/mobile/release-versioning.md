# 모바일 버전·빌드 채널

**작성일:** 2026-08-30  
**첫 내부 베타 버전:** `0.1.0`

## 고정 계약

- 공개 버전은 SemVer 형식의 `0.1.0`으로 시작한다.
- iOS bundle identifier와 Android package는 `com.ikkyee.mobile`이다.
- 저장소 초기 빌드 번호는 iOS `1`, Android `1`이다.
- EAS의 `appVersionSource`는 `remote`이며 production은 매 빌드 자동 증가한다.
- `development`는 개발 클라이언트, `development-simulator`는 iOS Simulator 개발 클라이언트다.
- `preview`는 개발 도구가 없는 내부 배포용 독립 앱이며 Android는 설치 가능한 APK를 만든다.
- `android-device-test`는 운영 Supabase의 공개 클라이언트 설정을 사용하되, 제한된 Google Maps 모바일 키가 준비되기 전까지 네이티브 지도와 장소 검색을 끈 Android 실기기 확인용 내부 APK다.
- `production`은 TestFlight·Google Play 내부 테스트와 스토어 제출용 빌드다.
- EAS Update는 현재 승인되지 않았으므로 `expo-updates`, `runtimeVersion`, 원격 OTA 배포를 구성하지 않는다.

설정의 기준 파일은 `mobile/release-contract.json`이다. `app.json`, `eas.json`과 다른 값이 들어오면 `npm run release:verify`와 CI가 실패한다.

## 버전 증가 규칙

- 사용자 기능 추가·호환되는 버그 수정: marketing version의 patch 또는 minor를 제품 결정에 따라 올린다.
- 네이티브 의존성, Expo SDK, 로컬 모듈, 권한 선언 변경: 새 앱 바이너리와 build number가 반드시 필요하다.
- production 재빌드: marketing version이 같아도 EAS remote build number를 증가시킨다.
- 스토어 공개 전에는 `0.x.y`, 공개 안정 버전 승인 시 `1.0.0`으로 전환한다.

## 아직 남은 외부 관문

Expo 프로젝트 `@hansokchun/ikkyee-mobile` 연결과 EAS 관리 Android 내부 APK 생성은 완료했다. Apple·Google 개발자 계정의 최종 식별자 확인, 제한된 모바일 지도 키, iOS 서명 자격 증명, remote build number 초기화와 실제 preview·production 스토어 빌드는 남아 있다.
