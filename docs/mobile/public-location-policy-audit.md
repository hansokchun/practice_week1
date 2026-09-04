# 모바일 위치 정확도 정책 대조

기준일: 2026-09-04

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
- 모바일 신규 게시 흐름은 아직 사진 위치를 서버로 전송하지 않으므로 `lat/lng = null`이며 지도 핀이 없다.
- 위치가 있는 사진의 상세에서는 두 정확도 모두 지도와 거리뷰 진입을 사용할 수 있다.

## 검증 근거

- 웹 정책·UI: `js/photo-location-privacy.mjs`, `index.html`, `docs/product/public-photo-privacy-policy.md`
- 데이터베이스: `supabase/migrations/20260904123000_reinterpret_location_precision_as_accuracy.sql`
- 모바일 조회: `mobile/src/explore-photo-repository.ts`, `mobile/src/public-photo-detail-repository.ts`
- 모바일 게시: `mobile/src/publication-publisher.ts`

## 남은 제품 작업

모바일 게시에서 위치를 함께 보내려면 게시 검토 화면에 사진별 위치 선택과 `정확한 위치`·`대략 위치` 선택을 추가한다. 현재는 위치를 보내지 않으므로 정확도 기본값만 저장되고 공개 지도 핀은 생성되지 않는다.
