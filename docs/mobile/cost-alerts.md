# 모바일 사용량·비용 경보

**작성일:** 2026-08-25  
**목적:** Ikkyee 모바일 출시가 API·지도·Storage·이미지·활성 사용자 비용을 예측 가능한 범위 안에서 운영하도록 경보와 조치를 정의한다.

가격·포함량은 플랜과 시점에 따라 바뀌므로 저장소에는 절대 금액이나 고정 무료량을 기준으로 두지 않는다. 매 출시 후보에서 Supabase와 Google Cloud 결제 화면의 현재 플랜·예산·할당량을 확인해 아래 비율에 대입한다.

## 공통 경보 단계

| 단계 | 조건 | 조치 |
| --- | --- | --- |
| 관찰 | 월 예산·할당량 예상치 50% 또는 최근 7일 평균의 1.5배 | 원인 분류, 다음 주 예상치 기록 |
| 경고 | 월 예산·할당량 70% 또는 하루 사용량이 최근 7일 같은 요일의 2배 | 담당자와 지원 채널 통지, 키 오용·재시도 폭증 확인 |
| 조치 | 월 예산·할당량 90% 또는 남은 기간 예상치가 한도를 초과 | 비핵심 호출 축소, 업로드 제한·지도 할당량 조정, 예산 승인 요청 |
| 비상 | 결제 실패·할당량 차단·비정상 유출 지속 | P1 이상 장애로 전환, 안전한 읽기와 로컬 기능 우선 유지 |

## 지표와 대응

| 영역 | 관찰 지표 | 70% 경고 확인 | 90% 조치 |
| --- | --- | --- | --- |
| API 요청 | PostgREST 요청 수·오류율·재시도율 | 화면 focus 중복 조회, 무한 페이지 요청, 비정상 클라이언트 | 캐시·요청 취소 확인, 비핵심 새로고침 제한, 서버 rate limit 검토 |
| Maps SDK | iOS·Android 지도 로드, 장소 검색 요청, 키별 거부율 | 패키지·번들 제한과 비정상 키 사용, 화면 재마운트 | Google 지도 할당량·예산 조정, 검색 debounce, 비핵심 지도 진입 제한 |
| Storage 용량 | `photos`·`avatars` 객체 수와 bytes, 월 증가율 | 파생 이미지 크기·고아 객체·계정 삭제 정리 | 신규 대용량 업로드 제한, 고아 파생본만 정리, 플랜 승인 |
| 이미지 egress | 서명 이미지 전송 bytes, 사진당 평균 전송량, 재발급·실패율 | 썸네일 대신 원본 로드, focus 갱신 폭증, CDN·캐시 회귀 | 화면 크기 파생본 우선, 목록 동시 로드 축소, 원본 다운로드 제한 |
| Edge Function | 호출·실패·실행 시간·egress | `photo-link`, `delete-account` 재시도와 4xx/5xx 분리 | 멱등 재시도 제한, 비핵심 호출 차단, 함수별 할당량 검토 |
| MAU | Supabase Auth MAU와 신규·복귀 집계 | 비정상 가입·봇·OAuth 반복 확인 | 가입 악용 제한, CAPTCHA·provider rate limit, 플랜 승인 |

비용 완화를 위해 공개 사진을 일괄 비공개로 바꾸지 않고 private bucket을 public으로 바꾸지 않는다. 사용자 원본을 지우지 않으며, 먼저 재생성 가능한 썸네일·게시 파생본과 중복 요청을 줄인다. 업로드 제한은 새 요청에만 적용하고 진행 중인 계정 삭제·개인정보 보호 작업을 막지 않는다.

## 집계와 개인정보

보고에는 날짜·환경·앱 버전별 집계값만 사용한다. 이메일, 사용자 ID, IP, 기기 식별자, 정확 좌표, 사진 ID·사진 URL·Storage 경로, 설명·댓글·검색어를 수집하거나 경보 메시지에 넣지 않는다. 소규모 집단의 행동을 역추적할 수 있는 보고는 병합하거나 생략한다.

운영 주간 보고는 기존 `scripts/report-usage-thresholds.sql`의 제품·Storage 집계를 재사용한다. Google Maps, Supabase MAU·egress·Edge Function은 각 공급자 결제·관찰 화면의 집계만 기록한다. 원시 로그를 비용 보고서로 복사하지 않는다.

## 외부 설정 관문

저장소는 경보 계약만 정의한다. 실제 금액·알림 수신자는 다음 외부 설정이 필요하다.

1. Supabase 조직의 현재 플랜·spend cap·사용량 알림을 확인한다.
2. Google Cloud Billing budget과 Maps API별 quota·알림을 설정한다.
3. 경고·조치·비상 단계의 담당자와 지원 채널을 지정한다.
4. 테스트 알림을 보내 수신과 에스컬레이션을 확인한다.

이 네 항목은 공개 베타 출시 전에 활성화하고 스크린샷 대신 설정 시각·담당 역할·테스트 알림 ID만 비공개 운영 기록에 남긴다. 저장소나 앱 번들에는 결제 계정·수신자 개인정보를 넣지 않는다.

## 공식 참고

- Supabase Billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Production Checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Google Maps billing and pricing: https://developers.google.com/maps/billing-and-pricing/
- Google Cloud budgets: https://cloud.google.com/billing/docs/how-to/budgets
