# 모바일 공개 위치 정책 대조

기준일: 2026-08-26

## 결론

웹과 모바일은 같은 Supabase `photos`·`photo_private_locations` 행과 데이터베이스 트리거를 사용한다. 따라서 웹에서 공개한 사진의 위치 정밀도는 모바일에 복사본을 만들지 않고 같은 공유 행을 통해 보인다.

Web supports `exact`, `approximate`, and `hidden` after an explicit owner choice. Mobile publication currently fixes every new publication to `hidden`; it does not transfer a local exact coordinate or offer an exact/approximate selector. Mobile Explore consumes eligible locations from shared Supabase `photos` rows. This audit does not claim that the current mobile publication flow can publish an exact location.

## 정책 행렬

| 정밀도 | DB 공개 투영 | 웹 | 모바일 Explore | 모바일 신규 게시 |
| --- | --- | --- | --- | --- |
| `hidden` | `photos.lat/lng = null`; 소유자 전용 원본은 유지 | 공개 프로필에는 보이지만 지도 핀은 없음 | 쿼리·행 파서 두 단계에서 제외 | 현재 안전 기본값 |
| `approximate` | 소유자 원본을 소수점 둘째 자리로 반올림 | 명시적 선택·지도 핀 | 공개 영역 쿼리·지도 핀 | 선택 UI 없음; 전송하지 않음 |
| `exact` | 소유자 원본을 명시적 선택 후 투영 | 명시적 선택·지도 핀 | 공개 영역 쿼리·지도 핀 | 선택 UI 없음; 전송하지 않음 |

## 강제 경계

- `apply_photo_location_privacy` 트리거가 모든 웹·모바일 쓰기에 같은 변환을 강제한다.
- 원본 좌표는 RLS로 소유자만 읽는 `photo_private_locations`에 보관한다.
- 모바일 Explore는 `visibility = public` 이면서 `location_precision in (approximate, exact)`인 행만 요청한다. 반환된 행도 다시 파싱해 `hidden`·알 수 없는 값을 fail-closed 처리한다.
- 모바일 공개 상세는 좌표 대신 정밀도 문구만 보여 준다.
- 정확 좌표는 URL, 로그, 충돌 보고, 공개 프로필 응답에 포함하지 않는다.

## 검증 근거

- 실제 역할 증빙: `docs/qa/public-location-privacy-role-qa-2026-07-26.md`
- 웹 정책·UI: `js/photo-location-privacy.mjs`, `docs/product/public-photo-privacy-policy.md`
- 데이터베이스: `supabase/migrations/20260724000000_initial_remote_schema_baseline.sql`
- 모바일 조회: `mobile/src/explore-photo-repository.ts`
- 모바일 게시: `mobile/src/publication-publisher.ts`

## 남은 제품 선택

모바일 게시에 위치를 추가하려면 게시 전 사진별 `hidden`·`approximate` 선택과 노출 문구를 먼저 제공한다. `exact`는 별도 선택·재확인·스토어 개인정보 고지가 갖춰진 후에만 활성화한다. 현재 출시 경계는 모바일에서 위치를 전송하지 않는 보수적 선택이다.
