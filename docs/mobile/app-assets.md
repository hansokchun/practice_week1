# Ikkyee 모바일 앱 자산

기준일: 2026-09-05

## 출시 자산

| 용도 | 파일 | 규격·정책 |
| --- | --- | --- |
| iOS·기본 Android 앱 아이콘 | `mobile/assets/app-icon.png` | 1024×1024, RGB, 불투명 |
| Android 적응형·테마 아이콘 | `mobile/assets/app-icon-foreground.png` | 1024×1024, RGBA, 중앙 안전 영역 마크 |
| 네이티브 시작 화면 | `mobile/assets/brand-logo.png` | 웹 `images/logo.png`와 동일한 디자인의 256×256 RGBA 최적화본, `#FFFFFF` 배경, 180pt, contain |
| 웹 파비콘 | `mobile/assets/favicon.png` | 512×512, RGBA |
| 공통 기본 프로필 | `mobile/assets/default-profile-avatar.png` | 512×512, 웹과 같은 Ikkyee 핀·잎 마크 |
| 메인 지구 배경 | `mobile/assets/landing-globe-sprout-route.jpg` | 웹 메인과 동일한 디자인의 1024×682 최적화본 |
| 메인 지도 CTA 배경 | `mobile/assets/landing-map-pins-background.jpg` | 웹 메인과 동일한 디자인의 1200×800 최적화본 |

Expo의 상위 `icon`, Android `adaptiveIcon.foregroundImage`·`monochromeImage`·`backgroundColor`, `expo-splash-screen` 구성 플러그인으로 연결한다. Expo Go는 독립 앱과 시작 화면이 다를 수 있으므로, 최종 표시 승인은 release 빌드에서 한다.

## 출처와 생성 기록

- 기준 마크: 저장소의 기존 `images/logo.png` (SHA-256 `82ff7eb0c53f142fa9ff6947a4310deccd54776182bf03b80a8ec65743383735`).
- 생성 방법: Codex 내장 이미지 도구로 기존 마크를 참조한 프로젝트 전용 래스터 자산.
- 전경 프롬프트: 기존 Ikkyee 위치 핀·잎·점선 여행 경로를 보존하고, `#1A4D4E` 색의 투명 배경 고해상도 마크로 정리하며, 중앙 60% 안전 영역과 무문자·무워터마크를 요구했다.
- 기본 아이콘 프롬프트: 동일 마크를 불투명 `#F9F7F2` 정사각형 배경에 놓고 스퀘클·원형 마스크 안전 영역, 무문자·무워터마크를 요구했다.
- 저장소 파생본 SHA-256: 기본 아이콘 `8b1c4a41220e1febb337ab0daf521c18214d1f7db9555b9794a5f1ebeaa051fb`, 적응형 전경 `70475c41ca5b0e91d5498df7b6dad93f49e610d5eacc1fe94501de1c446479a5`, 파비콘 `eab08d965c5895534cf549ee684a1ea34e7d2fb43b00db02dd61331102a30012`.
- 웹 패리티 자산: 기본 프로필은 기존 웹 `images/default-profile-avatar.png`의 동일 복사본(SHA-256 `6fb92b4af6de9b0a56e393745bafd374f72e732f67ed803993a240475fd7e73d`)이다. 시작 로고와 메인 배경은 웹 원본의 시각 디자인을 유지하면서 앱 번들에 맞게 축소·압축했다. 시작 로고 SHA-256은 `bc27bd34ded19de66c07b18a4acd07cf1b503625f71f81e3881eb24de29a18c7`, 메인 지구 배경은 `433c798925c53d336e756b35ced7b7f92f0afa44436c9218a0f9a5e5fb479cd6`, 지도 CTA 배경은 `ebc1e7295911c1928220218e52cf407142d527e0f0edade1faee45608961145e`이다.

## 남은 승인 관문

- TestFlight·Play 내부 테스트 release 빌드에서 iOS 스퀘클, Android 원형·스퀘클·테마 마스크와 시작 화면을 눈으로 확인한다.
- 스토어 스크린샷·설명·프라이버시 정보와 함께 최종 브랜드 승인을 받는다.
