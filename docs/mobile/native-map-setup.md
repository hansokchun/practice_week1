# Ikkyee 모바일 운영 지도 설정

기준일: 2026-08-26

## 선택한 경계

- Expo SDK 57에서 권장되는 `react-native-maps` 1.27.2를 사용한다.
- iOS·Android 모두 `PROVIDER_GOOGLE`로 동작해 웹과 같은 Google Maps 공급자 경계를 사용한다.
- Expo Maps는 SDK 57 문서에서 alpha이고 iOS Google Maps를 지원하지 않아 출시 경계로 선택하지 않았다.
- 사용자 현재 위치를 표시하지 않으므로 지도 때문에 위치 권한을 추가하지 않는다.

## 빌드 설정 경계

`mobile/app.config.js`는 두 빌드 키를 함께 받을 때만 `react-native-maps` 구성 플러그인과 `extra.nativeMapsEnabled = true`, `extra.nativePlaceSearchEnabled = true`를 출력한다.

```text
GOOGLE_MAPS_ANDROID_API_KEY
GOOGLE_MAPS_IOS_API_KEY
```

- development에 두 키가 없으면 외부 지도 요청이 없는 대체 지도를 사용한다.
- preview·production은 두 키 중 하나라도 없거나 한쪽만 있으면 config 단계에서 빌드를 거부한다.
- 키 값은 저장소·`app.json`·앱 JavaScript·로그에 기록하지 않고 EAS `preview`·`production` environment에 저장한다.
- Android 키는 `com.ikkyee.mobile` 패키지와 development·Play App Signing SHA-1에, iOS 키는 `com.ikkyee.mobile` bundle ID에 제한한다.
- 각 플랫폼 키의 API 제한에는 해당 Maps SDK와 Places API (New)를 함께 허용한다. 웹 서비스용 무제한 키나 JavaScript에 노출되는 Places REST 키는 만들지 않는다.

## 장소 검색 경계

- 저장소 로컬 Expo 모듈 `IkkyeePlaceSearch`가 Android Places SDK 5.1.1과 iOS Places SDK 9.4.0의 Text Search를 호출한다.
- Android는 지도 플러그인이 manifest에 넣은 `com.google.android.geo.API_KEY`, iOS는 Info.plist의 `GMSApiKey`를 네이티브에서 읽는다. 키 값은 JavaScript로 반환하지 않는다.
- 사용자가 검색을 제출할 때만 현재 지도 bounds를 위치 편향으로 보내며, 검색어는 공백 제거 후 1~80자로 제한한다.
- 결과는 최대 5개이며 place ID, 이름, 표시 주소, 좌표만 JavaScript로 전달한다. 공급자의 원시 오류는 로그나 화면에 표시하지 않는다.
- 결과 목록에는 `Powered by Google`을 표시한다. 장소를 선택하면 네이티브 지도의 controlled region이 바뀌고 해당 bounds의 공개 사진을 offset 0부터 다시 조회한다.
- 로그인 사용자는 `다른 사람 사진`과 `내 공개 사진`을 고를 수 있고, 익명 사용자는 전체 `공개 사진`만 본다. 모든 범위에서 `visibility = public` 및 `exact`·`approximate` 위치만 조회한다.

## 장소 검색 오류 복구

공급자 원문·키·상태 문자열은 화면이나 로그로 전달하지 않고 네이티브에서 아래 앱 코드로 정규화한다.

| 앱 상태 | Android | iOS | 사용자 복구 |
| --- | --- | --- | --- |
| 네트워크 | `CommonStatusCodes.NETWORK_ERROR` | `GMSPlacesErrorCode.networkError` | 연결 확인 후 같은 검색어로 재시도 |
| 할당량 | `PlacesStatusCodes.OVER_QUERY_LIMIT` | usage·rate·device rate limit | 잠시 후 같은 검색어로 재시도 |
| 키 설정 | `PlacesStatusCodes.REQUEST_DENIED` | invalid·expired key, API 미활성화, bundle 불일치 | 사용자의 반복 재시도를 막고 운영 설정 확인 |
| 결과 없음 | `PlacesStatusCodes.NOT_FOUND` 또는 빈 성공 결과 | 빈 성공 결과 | 빈 검색 결과 표시 |
| 그 외 | 일반 실패 | 일반 실패 | 안전한 일반 오류와 수동 재시도 |

검색 직전 Expo Network가 오프라인이면 SDK 요청 자체를 보내지 않는다. 네이티브 네트워크 오류는 사전 연결 확인 뒤 연결이 끊어진 경합도 복구할 수 있도록 별도로 유지한다.

## Explore 요청 동작

1. 서울 기본 bounds로 시작한다.
2. 네이티브 지도의 `onRegionChangeComplete`에서만 검증한 bounds를 받는다.
3. 유의미한 pan·zoom은 이전 요청을 `AbortController`로 취소하고 offset 0으로 새 영역을 조회한다.
4. `더 보기`는 새 영역의 bounds와 next offset을 계속 사용하며 중복 사진을 제거한다.
5. 화면 비율 기반 군집은 현재 bounds로 재계산되므로 zoom에 따라 자동으로 분리·결합된다. 군집의 위도·경도 중심과 안정 ID를 사용한다.
6. 마커 선택과 사진 미리보기는 지도 이동 후에도 현재 조회 결과 범위에서 유지한다.

## 외부 출시 관문

- Google Cloud에서 Maps SDK for Android·iOS와 Places API (New)를 활성화한다.
- Android development·Play 서명 SHA-1과 iOS 번들 ID로 각 키를 제한한다.
- EAS preview·production environment에 두 키를 등록한다.
- 서명 release 빌드에서 키 거부·할당량·네트워크 오류, pan·zoom, 백그라운드 복귀를 확인한다.

## 참고

- [Expo `react-native-maps`](https://docs.expo.dev/versions/latest/sdk/map-view/)
- [Expo app config](https://docs.expo.dev/versions/latest/config/app/)
- [Google Maps Platform API 보안 권장사항](https://developers.google.com/maps/api-security-best-practices)
- [Android Places Text Search](https://developers.google.com/maps/documentation/places/android-sdk/text-search)
- [iOS Places Text Search](https://developers.google.com/maps/documentation/places/ios-sdk/text-search)
