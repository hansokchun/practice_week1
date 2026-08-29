# 모바일 플랫폼 지원 기준

기준일: 2026-08-26  
적용 앱: Ikkyee Expo SDK 57 / React Native 0.86

## 설치 하한

| 플랫폼 | 최소 버전 | 빌드 적용 | 근거 |
| --- | --- | --- | --- |
| iOS | iOS 16.4 | `ios.deploymentTarget = 16.4`, iPhone 전용 | Expo SDK 57 공식 하한 |
| Android | Android 7.0, API 24 | `android.minSdkVersion = 24` | Expo SDK 57 및 Places SDK 5.1.1 하한 |

기계 판독 원장은 `mobile/platform-support.json`이다. `mobile/app.config.js`가 같은 값으로 `expo-build-properties`를 구성하고 `npm run platform:verify`가 설치된 Expo·Maps·Places 의존성보다 하한이 낮아지지 않았는지 검사한다.

2026-08-26 임시 production prebuild 검증에서 Android `gradle.properties`의 `android.minSdkVersion=24`, iOS `Podfile.properties.json`과 Xcode 프로젝트의 deployment target `16.4` 생성을 확인했다. 생성물은 검증 후 삭제했으며 저장소에는 네이티브 빌드 폴더를 추가하지 않았다.

iOS는 `supportsTablet: false`로 iPhone만 첫 출시 범위에 둔다. Android는 Google Maps·Places가 핵심 Explore 기능이므로 Google Play services와 Google APIs가 작동하는 기기 또는 동등한 인증 emulator가 필요하다. 스토어 설치 호환성은 OS/API·네이티브 ABI가 결정하며 아래 QA 등급의 RAM·여유 공간은 임의의 설치 차단 필터로 사용하지 않는다.

## QA 기기 등급

첫 공개 베타 출시 후보는 다음 등급에서 확인한다.

| 역할 | 최소 등급 | 확인 목적 |
| --- | --- | --- |
| 오래된 지원 iPhone | iOS 16.4를 실행하는 가장 오래된 확보 가능 iPhone | 메모리 압박, 10,000장 인덱싱, 키보드·안전 영역 |
| 현재 기준 iPhone | 현재 지원 iOS와 일반적인 현행 iPhone | 지도·Places·OAuth·공유 링크 기준 동작 |
| 저사양 Android | API 24+, 64-bit, RAM 4GiB, Google Play services | 메모리, 저장공간, 백 버튼, 권한 변경 |
| 중간급 Android | API 24+, 64-bit, RAM 6GiB 이상, Google Play services | 현재 사용자 기준 성능과 제조사 차이 |

모든 QA 기기는 실행 전 최소 1,024MiB의 여유 저장공간을 확보한다. 이 값은 최대 512MiB 썸네일 캐시, 로컬 SQLite, 앱 바이너리와 게시 파생본을 동시에 다룰 시험 여유이며 사용자 사진 원본 크기를 포함하지 않는다.

## 지원과 검증의 구분

- 설치 하한은 빌드가 배포 가능한 OS 범위다.
- QA 기기 등급은 출시 승인을 위한 측정 기준이며 App Store·Google Play의 기기 필터 주장이 아니다.
- simulator/emulator prebuild는 버전 설정과 네이티브 연결을 증명하지만 카메라 롤, 메모리 압박, iCloud 원본, Google Play services 제조사 차이를 증명하지 않는다.
- 실제 오래된 iPhone 1대와 RAM 4GiB Android, RAM 6GiB 이상 Android의 서명 release 검증은 실기기 QA 항목에서 미완료로 유지한다.
- SDK나 Maps/Places 주 버전을 올릴 때 `npm run platform:verify`와 양 플랫폼 prebuild를 다시 실행하고 하한 변경은 별도 출시 결정으로 기록한다.

## 공식 근거

- [Expo SDK 버전별 플랫폼 하한](https://docs.expo.dev/versions/latest/)
- [Expo BuildProperties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [Expo app configuration](https://docs.expo.dev/versions/latest/config/app/)
- [Places SDK for Android versions](https://developers.google.com/maps/documentation/places/android-sdk/versions)
- [Maps SDK for Android setup](https://developers.google.com/maps/documentation/android-sdk/config)
- [Places SDK for iOS release notes](https://developers.google.com/maps/documentation/places/ios-sdk/release-notes)
