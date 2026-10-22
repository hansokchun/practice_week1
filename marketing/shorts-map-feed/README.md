# 이끼 지도·사진 피드 쇼츠 최종 소스

2026-10-23에 제작한 최종 3초 V3와 4초 V4의 편집·재생성 자료입니다.
웹사이트와 앱에서는 이 폴더를 불러오지 않습니다.

[Google Drive 전달 폴더](https://drive.google.com/drive/u/0/folders/1Hp1wZn68dAovT-0aY0GxGb7bNCcZ6wI9)
에서 최종 MP4와 편집용 ZIP을 확인할 수 있습니다. 폴더 접근 권한은 Google Drive 설정을 따릅니다.
3초·4초 MP4 두 개, 각 전달 ZIP 두 개와 `ikkyee-shorts-map-feed-sources-2026-10-23.zip`
재제작 소스 묶음까지 총 5개 파일의 업로드 완료와 폴더 표시를 확인했습니다.

| 최종본 | 영상 | 미리보기 | 장면 |
| --- | --- | --- | --- |
| V3 | 1080 × 1920, H.264, 60fps, 3초, 180프레임, 무음 | 360 × 640, 15fps GIF | 지도 → 둥근 사진 핀 → 사진 확대 → 실제 메인 피드 합류·스크롤 → 승인된 로고 |
| V4 | 1080 × 1920, H.264, 60fps, 4초, 240프레임, 무음 | 360 × 640, 30fps GIF | 같은 구성, 얇은 청록 윤곽·잎 핀, 확대·목록 진입·스크롤 시간을 확장하고 곡선을 재계산 |

메인 화면은 실제 모바일 캡처를 홍보용으로 합성한 장면입니다.
가운데 추천 사진을 확대 사진으로 대체했으며 실제 업로드 동작을 촬영한 것은 아닙니다.
지도 안 Google 표기와 저작권 표시를 유지했습니다. 지도 핀은 영상용 연출이고,
브랜드 이미지는 기존 승인된 `장소아카이브 이끼` 원본을 사용합니다.

## 보존 범위

- `render-v3.mjs`, `render-v4.mjs`: 원래 장면과 시간을 유지한 프레임 생성기.
  다른 컴퓨터에서도 실행되도록 입력 이미지·출력 경로와 Sharp 조회 방식만 정리했습니다.
- `sources/`: 두 버전이 함께 사용하는 사진, 지도, 실제 메인 캡처 두 장, 승인된 브랜드 이미지.
  원본 출처 파일과 SHA-256은 `deliveries/*/render-settings.json`에 있습니다.
- `encode.swift`: macOS AVFoundation H.264 인코딩 및 전체 프레임 디코딩 검증.
- `preview-v3.cjs`, `preview-v4.cjs`: 해당 버전의 GIF 생성기.
- `deliveries/`: 전달 안내, 원본 검증 결과, 출력 파일 해시와 장면 설정.
- `delivery-files.json`: Google Drive 전달용 MP4·GIF·ZIP의 정확한 크기와 해시.

큰 MP4·GIF·ZIP, 추출 프레임, 중복 `.sb-*` 파일은 Git에 넣지 않습니다.
원본 전달물은 프로젝트 `output/shorts-map-feed-3s-v3-2026-10-23/` 및
`output/shorts-map-feed-4s-v4-2026-10-23/`에 보존했습니다.
아래 재생성 작업은 별도 출력 폴더를 사용해 원본 전달물을 덮어쓰지 마세요.

## 재생성

Node.js와 Sharp가 필요합니다. Sharp를 별도 설치한 경우 `SHARP_MODULE_PATH`로
패키지 경로를 지정할 수 있습니다. 웹 앱의 의존성에는 추가할 필요가 없습니다.
인코더는 AVFoundation을 사용할 수 있는 macOS와 Swift 도구가 필요합니다.

```sh
node marketing/shorts-map-feed/render-v3.mjs --out=output/shorts-rebuild-v3
node marketing/shorts-map-feed/render-v4.mjs --out=output/shorts-rebuild-v4
swiftc -parse-as-library marketing/shorts-map-feed/encode.swift -o /tmp/ikkyee-shorts-encoder
```

프레임 생성기가 출력하는 임시 프레임 폴더를 아래 `<frames-v3>`와 `<frames-v4>`에 넣으세요.

```sh
/tmp/ikkyee-shorts-encoder encode <frames-v3> output/shorts-rebuild-v3/ikkyee-shorts-map-feed-3s-v3.mp4 60 1080 1920 18000000
/tmp/ikkyee-shorts-encoder encode <frames-v4> output/shorts-rebuild-v4/ikkyee-shorts-map-feed-4s-v4.mp4 60 1080 1920 18000000
node marketing/shorts-map-feed/preview-v3.cjs <frames-v3> output/shorts-rebuild-v3/preview.gif
node marketing/shorts-map-feed/preview-v4.cjs <frames-v4> output/shorts-rebuild-v4/preview.gif
/tmp/ikkyee-shorts-encoder inspect output/shorts-rebuild-v3/ikkyee-shorts-map-feed-3s-v3.mp4
/tmp/ikkyee-shorts-encoder inspect output/shorts-rebuild-v4/ikkyee-shorts-map-feed-4s-v4.mp4
```

빠른 정지 화면 확인에는 생성기에 `--stills`를 추가하세요.
인코더와 GIF 생성기는 기존 파일을 덮어쓰지 않습니다. 인코딩 결과의 바이트 해시는
OS·코덱 버전에 따라 달라질 수 있으므로 새 결과는 길이·크기·프레임수·전체 디코딩도 검증하세요.
전달 당시 원본은 기록된 SHA-256과 일치하는지 확인할 수 있습니다.
