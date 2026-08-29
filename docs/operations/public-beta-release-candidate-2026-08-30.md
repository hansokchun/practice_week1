# Ikkyee 2026-08-30 출시 후보

**검증일:** 2026-08-30
**후보 브랜치:** GitHub `dev`
**후보 태그:** `release-candidate-2026-08-30`
**미리보기:** `https://dev.practice-week1-cws.pages.dev`
**판정:** 3단계 출시 후보. `main` 운영 배포 승인 전.

## 완료 범위

- 웹 핵심 기능과 반응형 UI를 자동 테스트로 회귀 검증했다.
- 랜딩 지구 배경을 PNG에서 JPEG로 최적화해 화면은 유지하고 이미지 전송량을 줄였다.
- Supabase 랜딩 정책의 RLS JWT 반복 평가 경고와 외래 키 인덱스 경고를 운영 프로젝에서 해소했다.
- 모바일은 Expo 57 패치 정합성과 웹·앱 랜딩 추천어 동일성을 복구했다.
- 샘플 사진과 개인 데이터는 삭제하지 않았고, 백업·복구 절차도 실행하지 않았다.

## 자동 검증 결과

| 검증 | 결과 |
| --- | --- |
| 웹 Node 테스트 | 640개 통과 |
| 웹 운영 빌드·성능 예산 | 통과 |
| Expo Doctor | 21/21 통과 |
| 모바일 lint·typecheck | 통과 |
| 모바일 테스트 | 83개 suite, 309개 통과 |
| 모바일 로컬 스키마 | 4개 시나리오 통과 |
| Android·iOS·Web production export | 통과 |
| 모바일 개인정보·보안·플랫폼 검사 | 통과 |

## 보류한 외부 관문

- 서명된 iPhone·Android 빌드의 OAuth, 지도, 딥링크, 안전 영역, 키보드 실기기 QA
- 모바일 전용 Supabase 마이그레이션과 Edge Functions 운영 배포
- EAS Preview·Production 환경변수, Apple Team ID, Android 서명 SHA-256 등 콘솔 설정
- App Store Connect·Google Play Console 실제 제출과 스토어 문구 승인
- 지원 이메일, 삭제·보존 정책, 개인정보 문구의 최종 사람 승인
- Supabase 유출 비밀번호 차단은 유료 플랜 전환 후 재검토

## 배포 경계

이 후보는 `dev` 미리보기까지만 승인한다. `main` push·merge·Cloudflare Production 배포는 4단계이며, 사용자의 명시적 승인 전에는 실행하지 않는다.
