# 모바일 위치 정확도 정책 대조

기준일: 2026-09-07

## 결론

웹과 모바일은 같은 Supabase `photos` 행의 좌표를 사용한다. `location_precision`은 좌표의 이동이나 공개 범위가 아니라 사용자가 지정한 지점에 대한 확신 정도를 나타낸다. 소유자와 다른 사용자의 지도는 같은 `lat/lng`를 사용한다.

## 정책 행렬

| 정확도 | 의미 | 저장·공개 좌표 | 기본값 |
| --- | --- | --- | --- |
| `exact` | 사진을 찍은 정확한 지점이라고 판단 | 선택한 좌표 그대로 | EXIF·GPX 좌표 |
| `approximate` | 주변은 맞지만 정확한 지점인지 불확실 | 선택한 좌표 그대로 | 지도 수동 지정 |
| 위치 없음 | 좌표가 없음 | `lat/lng = null`, 지도 핀 없음 | GPS가 없는 사진 |

## 공통 경계

- 공개 여부는 `visibility`가 결정하고 위치 정확도와 독립적으로 동작한다.
- `exact`와 `approximate` 모두 좌표를 반올림하거나 이동시키지 않는다.
- 공개 전환과 비공개 전환은 저장 좌표와 정확도 선택을 덮어쓰지 않는다.
- 모바일 Explore의 내 사진과 다른 사람 사진은 같은 `photos.lat/lng`를 사용한다.
- 모바일 신규 게시 흐름은 로컬에 저장된 촬영일과 위치를 같은 `photos` 행에 전송한다. 위치가 없을 때만 `lat/lng = null`이며 지도 핀이 없다.
- 현재 로컬 스키마는 EXIF 위치와 수동 보정 위치의 출처를 구분하지 않으므로, 앱에서 새로 게시한 위치는 좌표를 바꾸지 않고 보수적으로 `manual`·`approximate`로 기록한다.
- 위치가 있는 사진의 상세에서는 두 정확도 모두 지도와 거리뷰 진입을 사용할 수 있다.

## 검증 근거

- 웹 정책·UI: `js/photo-location-privacy.mjs`, `index.html`, `docs/product/public-photo-privacy-policy.md`
- 데이터베이스: `supabase/migrations/20260904123000_reinterpret_location_precision_as_accuracy.sql`
- 모바일 조회: `mobile/src/explore-photo-repository.ts`, `mobile/src/public-photo-detail-repository.ts`
- 모바일 게시: `mobile/src/publication-publisher.ts`

## 남은 제품 작업

게시 전 사진별 `정확한 위치`·`대략 위치` 선택은 아직 없다. 게시 뒤 본인 사진 상세의 수정 화면에서 공개 여부와 위치 정확도를 바꿀 수 있으며, EXIF와 수동 보정의 출처를 자동 보존하려면 로컬 스키마에 별도 출처 열을 추가해야 한다.
