# 모바일 스토어 개인정보 선언 초안

검토일: 2026-08-26  
상태: App Store Connect·Google Play Console 제출 전 운영자 및 법률 검토 필요

이 문서는 현재 모바일 코드와 설치된 SDK를 기준으로 만든 제출용 원장이다. 법률 자문이나 콘솔 제출 완료 증명이 아니며, 최종 공개 정책·보존 기간·지원 연락처와 대조한 뒤 운영자가 승인해야 한다. 기계 판독 기준은 `mobile/store-privacy-contract.json`이고 Expo iOS 구성도 같은 파일을 읽는다.

## 경계

### 로컬 전용

- 운영체제 사진 원본은 사용자가 명시적으로 게시하지 않는 한 기기 밖으로 보내지 않는다.
- 사진 EXIF·GPS, 수동 위치 보정, SQLite 인덱스, 썸네일 캐시는 백업 제외 앱 저장소에서만 처리한다.
- 게시할 때는 메타데이터를 제거한 파생 JPEG만 전송하며 현재 모바일 신규 게시 위치는 `hidden`, `lat: null`, `lng: null`이다.
- 공유 링크의 원문 토큰은 서버에 저장하지 않고 SHA-256 해시만 저장한다.

기기에만 머무는 데이터는 Apple·Google의 서버 수집 항목으로 과장하지 않는다. 반대로 사용자가 명시적으로 게시한 사진과 프로필, 댓글·좋아요·신고·차단 데이터는 Supabase로 전송되므로 수집으로 선언한다.

## Apple 초안

`mobile/store-privacy-contract.json`의 `apple.privacyManifest`를 `mobile/app.config.js`가 `ios.privacyManifests`에 그대로 연결한다.

- 추적: 아니요
- 추적 도메인: 없음
- 앱·계정 데이터: 이름, 이메일 주소, 사용자 ID, 게시 사진, 기타 사용자 콘텐츠
- 기능·SDK 데이터: 검색 기록, 제품 상호작용, 기기 ID, 충돌·성능·기타 진단 데이터
- 위치: 설치된 `react-native-maps` iOS PrivacyInfo가 정확한 위치를 앱 기능 목적으로 선언하므로 병합 매니페스트에 보수적으로 포함한다. 현재 Ikkyee는 기기 현재 위치 권한을 요청하거나 로컬 사진 GPS를 Maps/Places로 전송하지 않는다. App Store Connect 답변은 제출 빌드의 Xcode Privacy Report와 이 실제 동작을 함께 확인해 확정한다.
- 필수 사유 API: 파일 타임스탬프, 디스크 공간, 시스템 부팅 시간, UserDefaults

임시 production iOS prebuild의 `PrivacyInfo.xcprivacy`에서 추적 `false`, 추적 도메인 0개, 수집 유형 12개, 필수 사유 API 유형 4개가 생성되는 것을 확인했다.

## Google Play 초안

Google Play Console의 데이터 보안 양식에는 다음을 수집으로 입력하는 초안이다.

| 범주 | 데이터 유형 | 필수 여부 | 주 목적 |
| --- | --- | --- | --- |
| 개인정보 | 이름, 이메일 주소, 사용자 ID | 계정 기능에 따라 선택 | 계정 관리, 앱 기능 |
| 사진 및 동영상 | 사용자가 게시한 사진·프로필 사진 | 선택 | 앱 기능 |
| 앱 활동 | 기타 사용자 생성 콘텐츠, 앱 상호작용, 검색 기록 | 선택 | 앱 기능, 제한적 SDK 분석 |
| 기기 또는 기타 ID | Maps/Places SDK 식별자 | 필수 | 앱 기능, SDK 분석 |
| 앱 정보 및 성능 | 충돌 로그, 진단 | 필수 | SDK 안정성·분석 |

현재 초안에서 정확한 위치·대략적 위치는 제외한다. Android 앱은 현재 위치 서비스를 요청하지 않고, 사진 GPS는 로컬에만 보관하며, 모바일 게시 행은 위치를 숨긴다. 지도 이동·확대 및 장소 검색 요청 메타데이터는 앱 상호작용·검색 기록·진단에 포함한다.

`dataShared: false`는 Supabase와 Google Maps/Places를 앱을 대신해 처리하는 서비스 제공자로, Google·Kakao OAuth를 사용자가 지시한 인증 흐름으로 분류한 코드 기반 초안이다. 콘솔 제출 전 최신 공급자 약관과 실제 계약 관계를 운영자 또는 법률 담당자가 확인해야 한다.

## 처리자와 전송

- Supabase: 인증, 프로필, 게시 사진, 댓글, 좋아요, 신고, 차단
- Google Maps/Places: 지도·장소 검색 요청, IP 주소, 기기·SDK 메타데이터, 지도 상호작용, 충돌·진단
- Google·Kakao OAuth: 사용자가 선택한 로그인·계정 연결 요청과 공급자 응답
- 전송 구간: HTTPS/TLS
- 광고, 데이터 판매, 교차 앱 추적: 없음
- 별도 분석·오류 보고 SDK: 없음
- 앱 내 계정 삭제: 구현됨. 보존 기간과 공개 개인정보 처리방침 문구는 별도 사람 승인이 남아 있다.

## 제출 직전 절차

1. 제출할 잠금 파일로 `npm ci`를 수행한 뒤 `cd mobile && npm run privacy:verify`를 통과시킨다.
2. 서명된 iOS archive의 Xcode Privacy Report를 열어 현재 12개 데이터 유형·4개 필수 사유 API와 대조한다.
3. App Store Connect의 App Privacy 답변을 이 원장과 최종 개인정보 처리방침에 맞춰 입력한다.
4. Google Play Console 데이터 보안 양식에서 수집·선택 여부·목적·암호화·삭제 지원을 입력한다.
5. Play의 사진 및 동영상 권한 선언이 실제 장기 사진 저널 핵심 기능과 일치하는지 검토한다.
6. Maps/Places·Supabase·OAuth 공급자 공개 문서와 계약 상태를 다시 확인한다.
7. 운영자와 법률 검토자가 최종 답변을 승인하고 콘솔 제출 증빙을 출시 원장에 남긴다.

## 공식 기준

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple Privacy Manifest collected data types](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes)
- [Expo Apple privacy manifest configuration](https://docs.expo.dev/guides/apple-privacy/)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play Photo and Video Permissions policy](https://support.google.com/googleplay/android-developer/answer/16558241)
- [Google Places SDK for Android data disclosure](https://developers.google.com/maps/documentation/places/android-sdk/play-data-disclosure)
- [Google Maps SDK for Android data disclosure](https://developers.google.com/maps/documentation/android-sdk/play-data-disclosure)
