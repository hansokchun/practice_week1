# 모바일 스토어 심사 인계 초안

**검토일:** 2026-08-30
**상태:** 콘솔 입력 전 운영자 승인 필요

기계 판독 원장은 `mobile/store-review-contract.json`이다. 이 문서는 현재 앱 기능을 스토어 질문에 옮기기 위한 초안이며 Apple 또는 Google이 계산하는 최종 등급을 미리 확정하지 않는다.

## 콘텐츠와 연령 등급

Ikkyee는 공개 여행 사진과 댓글을 제공하므로 사용자 생성 콘텐츠와 비동기 사용자 소통 기능을 `있음`으로 답한다. 앱이 직접 제공하는 폭력, 성적 콘텐츠, 도박, 약물 콘텐츠, 광고, 인앱 구매, 전리품 상자와 대회는 없다.

안전 기능은 다음과 같이 증명된다.

- 공개 사진·댓글 신고와 사용자 차단
- 소유 사진 삭제와 공개 회수
- 앱·웹 계정 삭제
- 신고 검토 상태와 운영 절차

근거는 `mobile/src/content-safety-repository.ts`, `mobile/src/BlockedUsersSection.tsx`, `mobile/src/publication-deletion.ts`, `mobile/src/AccountDeletionSection.tsx`, `docs/mobile/content-safety-operations.md`다.

Apple App Store Connect에서는 Age Ratings 설문을 완료하고 `User-Generated Content`와 실제 댓글 기능을 사실대로 선택한다. Made for Kids는 선택하지 않는다. Google Play Console에서는 **All Other App Types**로 IARC 설문을 완료한다. 계산 등급은 콘솔 결과를 받은 뒤 원장에 기록한다.

## 수출 규정

현재 앱은 자체 또는 비표준 암호 알고리즘을 구현하지 않는다. 통신은 운영체제와 공급자 SDK의 HTTPS/TLS를 사용하고, 로그인 토큰은 Expo SecureStore를 통해 운영체제 키체인에 보관한다. 이에 따라 Expo iOS 설정은 `ios.config.usesNonExemptEncryption: false`로 생성한다.

이 선언은 현재 의존성과 동작 기준 초안이다. 제출할 서명 archive의 네이티브 의존성을 다시 검사하고 App Store Connect 질문과 일치할 때만 확정한다. 암호화 기능이나 SDK를 추가하면 반드시 다시 검토한다.

## 심사 접근

비회원도 랜딩과 공개 Explore를 볼 수 있지만, 내 사진·게시·좋아요·댓글·차단·계정 삭제 전체 검수에는 로그인 계정이 필요하다. Apple과 Google에는 다음 조건의 별도 심사 계정을 제공한다.

- 이메일과 비밀번호로 언제든 재사용 가능
- OTP·MFA·위치 제한 없음
- 개인 사진·개인 연락처가 없는 전용 fixture
- 비공개 사진 1장, 공개 사진 2장 이상, 좋아요 1개를 준비
- 심사 종료 직후 임의로 만료시키지 않고 다음 업데이트 검수에도 유지

자격 증명과 심사 담당자 전화·이메일은 저장소에 기록하지 않는다. Apple App Review Information과 Google Play App access의 비공개 필드에만 입력한다.

## 심사 메모 초안

1. 앱을 열면 로그인 없이 공개 여행 사진과 Explore 지도를 볼 수 있습니다.
2. 전체 기능은 제공된 이메일 심사 계정으로 로그인해 확인합니다.
3. 프로필에서 정책·지원·계정 삭제 안내를 열 수 있습니다.
4. 내 사진은 기기 원본을 자동 업로드하지 않습니다. 사용자가 사진을 선택하고 게시 확인을 마쳐야 클라우드로 전송됩니다.
5. 공개 사진 상세에서 댓글, 신고, 차단과 좋아요를 확인할 수 있습니다.
6. 프로필의 계정 삭제는 정확히 `계정 삭제`를 입력해야 실행되며 기기 사진 원본은 삭제하지 않습니다.
7. 지도와 장소 검색은 네트워크가 필요합니다. 위치가 숨겨진 사진은 공개 지도 핀으로 표시하지 않습니다.

## 운영자가 입력할 항목

- Apple 심사 담당자 이름, 공개 가능한 업무 이메일, 국제 형식 전화번호
- Apple·Google에서 공통 사용할 전용 심사 계정과 비밀번호
- Apple Age Ratings와 Google IARC의 계산 결과
- 서비스 최소 이용 연령과 대상 국가
- 제출 archive의 수출 규정 최종 확인

## 공식 기준

- [Apple age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Apple export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/)
- [Apple review information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Google Play content rating](https://support.google.com/googleplay/android-developer/answer/9859655)
- [Expo TestFlight encryption setting](https://docs.expo.dev/submit/testflight/)
