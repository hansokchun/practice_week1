# 사용량·저장공간·비용 임계치 운영

**기준일:** 2026-08-02

## 운영 원칙

- 매주 월요일에 `scripts/report-usage-thresholds.sql`을 Supabase SQL Editor 또는 MCP의 읽기 전용 실행으로 확인한다.
- 현재 플랜 할당량의 70%에 도달하면 경고로 기록하고 증가 원인을 확인한다.
- 현재 플랜 할당량의 90%에 도달하면 신규 대용량 업로드 제한, 이미지 최적화 또는 플랜 변경을 결정한다.
- 결제 직전까지 기다리지 않고 최근 4주 증가율로 다음 달 예상치를 계산한다.
- 보고에는 집계값만 사용하며 이메일, 사용자 ID, 좌표, 사진 URL, 파일 경로를 남기지 않는다.

## 공식 한도 기준

| 항목 | Free | Pro | 경고 | 조치 |
| --- | ---: | ---: | ---: | ---: |
| Supabase Storage | 1 GB | 100 GB 포함 | 현재 플랜의 70% | 현재 플랜의 90% |
| Supabase MAU | 50,000 | 100,000 포함 | 현재 플랜의 70% | 현재 플랜의 90% |
| Supabase Egress | 5 GB | 250 GB 포함 | 현재 플랜의 70% | 현재 플랜의 90% |
| Cloudflare Pages 빌드 | Free 500회/월 | Pro 5,000회/월 | 70% | 90% |
| Cloudflare Pages Functions | Workers 할당량 사용 | Workers 할당량 사용 | 70% | 90% |

Cloudflare Pages 정적 자산 요청은 무료이며 무제한이다. `/api/config`처럼 Pages Functions를 호출하는 요청만 Workers 사용량에 포함한다. 가격과 한도는 변경될 수 있으므로 분기마다 공식 문서를 다시 확인한다.

## 2026-08-02 기준선

| 지표 | 값 |
| --- | ---: |
| Auth 계정 | 2 |
| 사진 | 21 |
| 앨범 | 3 |
| 좋아요 | 4 |
| 댓글 | 0 |
| 사진 Storage 객체 | 31 |
| 사진 Storage 사용량 | 77,617,556 bytes, 약 0.072 GiB |

현재 Storage 사용량은 Free 1GB 기준 약 7.2%이며 경고 단계가 아니다. 실제 조직 플랜과 월간 egress·MAU·Functions 호출량은 각 서비스 결제 대시보드에서 확인한다.

## 2026-08-10 샘플 리셋 기준선

| 지표 | 값 |
| --- | ---: |
| Auth 계정 | 3 |
| 프로필 | 3 |
| 사진 | 0 |
| 앨범 | 0 |
| 좋아요·댓글·비공개 위치 | 0 |
| 비공개 Storage 객체 | 0 |

DB 샘플과 Storage 파일·빈 폴더 플레이스홀더까지 모두 삭제됐다. Auth 계정과 프로필은 각 3개, `photos` 버킷과 Storage 정책 4개는 보존됐다.

## 주간 판정

1. 집계 SQL 결과를 이전 주와 비교한다.
2. 사진당 평균 크기가 3MB를 넘으면 업로드 최적화 회귀를 조사한다.
3. Storage, MAU, egress 중 하나가 70%를 넘으면 Notion 피드백 DB에 운영 항목을 등록한다.
4. 90%를 넘거나 월 증가율이 남은 용량보다 크면 업로드 제한 또는 이전 계획을 실행한다.
5. Cloudflare 배포가 월 한도의 70%를 넘으면 불필요한 자동 배포와 재시도를 줄인다.

## 공식 참고

- Supabase Pricing: https://supabase.com/pricing
- Supabase Billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Cloudflare Pages Limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Pages Functions Pricing: https://developers.cloudflare.com/pages/functions/pricing/
