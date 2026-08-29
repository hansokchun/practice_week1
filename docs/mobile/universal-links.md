# Ikkyee 모바일 HTTPS 링크 설정

기준일: 2026-08-26

## 링크 경계

- 운영 공유 URL은 `https://practice-week1-cws.pages.dev/photo-link#<64자 토큰>`이다.
- Preview는 `https://dev.practice-week1-cws.pages.dev/photo-link#<64자 토큰>`을 사용한다.
- development에서 HTTPS origin이 없을 때만 `ikkyee://photo-link/<토큰>`을 수동 테스트 대체 경로로 사용한다.
- 토큰은 서버 요청·Cloudflare URL 로그·Referrer에 들어가지 않는 URL fragment에만 두고, fallback 응답은 `no-store`, `no-referrer`, `noindex`로 제공한다.
- 앱이 설치되면 iOS Universal Links 또는 Android App Links가 정확한 `/photo-link` 경로만 앱으로 전달한다. 미설치 상태에서는 Cloudflare의 최소 대체 화면이 fragment를 로컬에서 검증한 뒤 앱 열기와 웹 홈 이동을 제공한다.

## 앱 구성

- iOS Associated Domains: `applinks:practice-week1-cws.pages.dev`
- Android verified intent filter: HTTPS host와 정확한 `/photo-link` path, `autoVerify: true`
- 앱 식별자: `com.ikkyee.mobile`

동적 Expo config는 production·preview origin이 다른 환경의 도메인으로 바뀌면 빌드를 거부한다. 개발 중 임의 HTTPS origin은 명시적 `EXPO_PUBLIC_LINK_ORIGIN`으로만 사용할 수 있다.

## Cloudflare 외부 설정

production과 preview Pages environment에 다음 공개 식별값을 등록한다.

```text
APPLE_TEAM_ID=<10자 Apple Team ID>
ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS=<콜론 구분 SHA-256 지문>[,<교체 지문>]
```

- 값이 없거나 형식이 잘못되면 두 association endpoint는 404를 반환한다. 임시 ID로 연결을 열지 않는다.
- `/.well-known/apple-app-site-association`과 `/.well-known/assetlinks.json`은 HTTPS에서 redirect 없이 `application/json`으로 응답해야 한다.
- Android 지문은 development 서명이 아니라 배포 대상 EAS/Play App Signing 인증서 지문을 넣는다. 인증서 교체 기간에는 쉼표로 두 지문을 함께 제공한다.

## 서명 빌드 검증

1. association endpoint의 상태·Content-Type·본문 식별자를 확인한다.
2. iOS Notes에서 HTTPS 링크를 길게 눌러 앱 열기 선택지를 확인하고 cold·warm·background 상태를 각각 연다.
3. Android에서 `adb shell pm verify-app-links --re-verify com.ikkyee.mobile` 후 링크 처리 상태를 확인한다.
4. 앱 설치 상태에서는 `/photo-link#<토큰>` 화면이 열리고, 미설치 상태에서는 웹 대체 화면이 열린다.
5. 잘못된·만료·해제 토큰은 사진이나 내부 오류를 노출하지 않는 동일 unavailable 상태로 끝난다.

## 참고

- [Expo Android App Links](https://docs.expo.dev/linking/android-app-links/)
- [Expo app config](https://docs.expo.dev/versions/v57.0.0/config/app/)
- [Apple Supporting Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Android website associations](https://developer.android.com/training/app-links/configure-assetlinks)
