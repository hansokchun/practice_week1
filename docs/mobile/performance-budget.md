# 모바일 출시 성능 예산

기준일: 2026-08-25

## 자동 출시 관문

`npm --prefix mobile run export:all` 후 `npm --prefix mobile run performance:verify`를 실행한다. CI는 공개 로컬 개발 URL·publishable key 예시로 production Metro export를 만들며 운영 계정이나 비밀값에 연결하지 않는다.

| 측정값 | 예산 | 2026-08-25 기준선 |
| --- | ---: | ---: |
| iOS Hermes 엔트리 | 4,000,000 bytes | 3,651,791 bytes |
| Android Hermes 엔트리 | 4,400,000 bytes | 3,956,149 bytes |
| Web 초기 엔트리 | 1,850,000 bytes | 1,663,327 bytes |
| 가장 큰 번들 자산 | 1,100,000 bytes | 962,968 bytes |
| 전체 Expo export | 12,000,000 bytes | 10,815,138 bytes |

예산은 현재 검증된 기준선에 약 10~15% 회귀 여유를 둔다. 임계값을 넘기면 기능을 삭제해 숫자만 맞추지 않고 Expo Atlas로 증가 모듈을 확인한 뒤 플랫폼 분기, 개발 전용 코드, 중복 자산을 줄인다. Expo production export는 플랫폼별 최적화와 minification이 적용되는 산출물을 사용한다.

## 실행 시 상한

- 썸네일은 긴 변 512px, 기본 동시 처리 4개·절대 최대 8개, 앱 관리 LRU 캐시 512MiB 이하다.
- 게시 파생본은 긴 변 2,048px, 한 번에 최대 20장이고 성공·실패·취소 또는 60분 만료 시 정리한다.
- MediaLibrary는 250개 단위, 실행당 최대 10,000개를 처리하고 체크포인트로 재개한다.
- Explore는 20개 단위로 요청하며 저장소 계층이 요청당 50개를 넘지 못하게 한다.
- 300초 서명 URL은 focus 중 270초에만 갱신하고 background에서는 중지한다.

이 상한은 메모리·저장공간·이미지 디코딩·네트워크·배터리 비용을 동시에 제한한다. React Native의 60fps 목표를 기준으로 목록에는 원본 대신 512px 썸네일과 `FlatList` 가상화를 사용한다.

## 실기기 출시 관문

아래 수치는 Preview 서명 빌드에서 지원 최저 사양 Android, 중간 사양 Android, 지원 iPhone으로 각각 5회 이상 측정한다. 개발 빌드·시뮬레이터 수치는 인정하지 않는다.

| 항목 | 통과 기준 |
| --- | ---: |
| cold start p75 | 2.5초 이하 |
| warm start p75 | 1.0초 이하 |
| Explore·내 사진 스크롤 지속 FPS | 55fps 이상 |
| 10,000장 인덱싱 후 앱 메모리 | 350MiB 이하 |
| 앱 관리 저장공간 | 600MiB 이하 |
| Explore 이동·확대와 1,000장 스캔 10분 배터리 감소 | 5% 이하 |

추가로 Wi-Fi, 제한된 네트워크, 오프라인 복귀에서 중복 요청·무한 재시도가 없는지 확인하고, 썸네일 캐시가 512MiB를 넘기 전에 제거되는지 기기 파일 시스템에서 확인한다. 측정에는 기기 모델·OS·빌드 번호·시작 유형·표본과 p50/p75/p95를 기록하며 사진 내용·정확한 위치·사용자 식별자는 기록하지 않는다.

실기기 수치가 수집되기 전에는 전체 성능 체크리스트 항목을 완료로 전환하지 않는다.

## 공식 근거

- https://reactnative.dev/docs/performance
- https://reactnative.dev/docs/optimizing-flatlist-configuration
- https://docs.expo.dev/guides/analyzing-bundles/
- https://docs.expo.dev/guides/tree-shaking/
