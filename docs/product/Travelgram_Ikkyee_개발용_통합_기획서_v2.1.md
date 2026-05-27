# Travelgram / Ikkyee 개발용 통합 기획서 v2.1

## 0. 문서 목적

이 문서는 Travelgram / Ikkyee의 개발 기준 문서다. v2의 제품 방향성은 유지하되, 이번 수정에서는 웹앱의 상위 IA를 다음 3개 페이지로 확정한다.

```text
1. Home
2. Myphoto
3. Explore
```

기존 문서에서 세부 페이지로 나뉘어 있던 `My Trips`, `Create Trip`, `Photo Upload`, `Trip Detail`, `Public Feed / Explore`, `Public Photo Detail` 등은 독립적인 상위 메뉴가 아니라, 위 3개 페이지 안의 하위 화면, 모달, 드로어, 상세 패널로 정리한다.

개발할 때 이 문서를 1차 기준으로 사용한다. 기존 문서의 큰 방향인 “개인 여행 사진 지도 아카이브 중심”, “공개 기능은 보조”, “GPS companion app은 MVP 제외”, “GPX는 고급 옵션” 원칙은 유지한다.

---

# 1. 최종 제품 정의

## 1-1. 한 줄 정의

```text
Travelgram / Ikkyee는 사용자가 여행 사진을 선택하면 사진의 좌표와 촬영 시간을 바탕으로 여행 경험을 지도 위에 자동 정리해주는 사진 기반 여행 아카이브 웹 서비스다.
```

## 1-2. MVP 핵심 약속

```text
사진을 고르면, 여행 지도가 만들어진다.
```

이 문장은 MVP의 가장 중요한 기준이다. 기능을 추가할 때는 다음 질문을 통과해야 한다.

```text
이 기능이 사용자가 사진을 지도 기반 여행 기록으로 만드는 데 직접 도움이 되는가?
```

도움이 되지 않는 기능은 MVP에서 후순위로 둔다.

## 1-3. 제품 포지션

MVP v1의 시작점은 여행 SNS가 아니다.

```text
1순위: 개인 여행 사진 지도 아카이브
2순위: 공개 앨범/사진 참고 및 공유
3순위: 좋아요·구독을 통한 재방문 보조
4순위: 여행지 탐색 / 추천 / 랭킹 / 커뮤니티
```

공개 사진, 공개 앨범, 좋아요, 구독, Explore 지도는 MVP에 포함한다. 다만 이 기능들은 SNS화를 위한 핵심 기능이 아니라, 공개 여행 기록을 참고하고 좋은 기록자를 다시 찾아가기 위한 보조 기능으로 정의한다.

---

# 2. 이번 IA 결정 평가

## 2-1. 결론

`Home / Myphoto / Explore` 3개 상위 페이지 구조는 MVP에 적합하다.

이 구조는 사용자가 서비스를 이해하는 영역, 자신의 사진을 정리하는 영역, 다른 사람의 공개 사진을 둘러보는 영역을 명확하게 분리한다. 기존 기획처럼 페이지가 지나치게 많으면 개발자와 사용자 모두 “어디서 무엇을 해야 하는지” 헷갈릴 수 있는데, 3개 상위 메뉴로 접으면 제품의 중심이 더 명확해진다.

```text
Home     = 서비스 이해 / 랜딩 / 공개 앨범 예시
Myphoto  = 내 사진 업로드 / 내 앨범 생성 / 내 앨범 감상
Explore  = 지도 기반 공개 사진 탐색
```

## 2-2. 좋은 점

### 1. 제품 중심이 흐려지지 않는다

Home은 랜딩, Myphoto는 개인 아카이브, Explore는 공개 탐색으로 역할이 분리된다. 공개 기능이 있어도 Myphoto가 중심을 잡기 때문에 서비스가 곧바로 SNS처럼 보이지 않는다.

### 2. 개발 범위가 정리된다

기존의 `My Trips`, `Create Trip`, `Photo Upload`, `Review Map`, `Trip Detail`을 전부 상위 페이지로 두면 IA가 복잡해진다. 이번 구조에서는 이들을 Myphoto 내부의 상태와 하위 화면으로 다룰 수 있다.

```text
Myphoto
- 최근 사진
- 내 앨범
- 사진 올리기
- 앨범 만들기
- 사진 상세 모달
- 앨범 상세 화면
```

이렇게 정리하면 개발 우선순위도 명확해진다.

### 3. Explore를 피드가 아니라 지도 중심으로 잡은 것이 좋다

Travelgram / Ikkyee의 차별점은 공개 사진을 최신순 카드로 소비하는 것이 아니라, 사진이 찍힌 위치를 지도에서 본다는 점이다. 따라서 Explore를 카드 피드보다 지도 풀화면으로 시작하는 방향은 맞다.

### 4. 앨범 상세의 좌측 사진 + 우측 지도 구조가 핵심 가치와 잘 맞는다

사용자가 만든 앨범을 볼 때 왼쪽에는 사진을 날짜별로 보고, 오른쪽에는 해당 날짜의 촬영 위치가 지도에 보이는 구조는 제품의 핵심인 “사진의 맥락을 지도에서 다시 보기”와 잘 맞는다.

## 2-3. 보완해야 할 점

### 1. Myphoto가 너무 많은 기능을 떠안는다

Myphoto 안에 최근 사진, 앨범, 업로드, 앨범 만들기, 사진 상세, 앨범 상세가 모두 들어간다. 따라서 Myphoto 첫 화면은 반드시 탭 또는 섹션으로 정리해야 한다.

권장 구조는 다음이다.

```text
Myphoto
- 상단 요약 / CTA
- 최근 사진
- 내 앨범
- 업로드 / 앨범 만들기 액션
```

처음부터 모든 기능을 한 화면에 늘어놓으면 복잡해진다. 사용자의 1차 행동은 `사진 올리기` 또는 `앨범 만들기`여야 한다.

### 2. 사진 상세는 별도 페이지보다 모달/드로어가 낫다

개별 사진 클릭 시 새 페이지로 이동하면 탐색 흐름이 끊긴다. 사용자가 사진 목록을 보다가 클릭하면 큰 사진이 뜨고, 옆에 작은 지도와 메타 정보가 보이는 모달/드로어 구조가 적절하다.

```text
사진 클릭
→ 사진 상세 모달 또는 드로어 열림
→ 큰 사진 + 작은 지도 + 촬영 시간 + 위치 정보
→ 닫으면 원래 목록 위치로 복귀
```

### 3. 앨범 상세 지도는 “완전히 바뀜”보다 “활성 날짜 중심 표시”가 낫다

사용자가 Day 1을 보고 있으면 지도에는 Day 1의 핀이 강조되어야 한다. Day 2로 넘어가면 Day 2 핀이 강조된다. 다만 이전/다음 날짜 핀을 완전히 없애면 전체 여행 맥락이 사라질 수 있다.

MVP 권장 방식은 다음이다.

```text
기본: 현재 날짜의 핀을 강조
보조: 다른 날짜 핀은 흐리게 표시하거나 토글로 숨김
옵션: “현재 날짜만 보기” 토글 제공
```

이렇게 하면 날짜별 집중과 전체 동선 이해를 둘 다 챙길 수 있다.

### 4. Explore는 공개 데이터가 적으면 비어 보일 위험이 있다

Explore를 지도 풀화면으로 시작하면 공개 사진 데이터가 적을 때 화면이 허전해질 수 있다. MVP 초기에는 공개 사진이 충분하지 않을 가능성이 높다. 따라서 다음 처리가 필요하다.

```text
- 공개 사진이 많은 지역으로 이동하는 추천 버튼
- 샘플 공개 앨범/사진
- 현재 지도 영역에 결과가 없을 때 empty state
- 줌 레벨이 너무 낮을 때 클러스터 또는 지역 단위 표시
```

### 5. 공개 위치 정책을 반드시 적용해야 한다

Explore는 다른 사람의 사진 위치를 지도에 찍는 화면이다. 따라서 public이면서 위치 공개가 허용된 사진만 보여야 한다. 위치 정확도가 approximate 또는 hidden인 사진은 그대로 핀을 찍으면 안 된다.

---

# 3. 최종 상위 IA

## 3-1. 상위 내비게이션

상위 내비게이션은 3개로 고정한다.

```text
Home
Myphoto
Explore
```

데스크톱에서는 상단 내비게이션 또는 좌측 사이드바 중 하나를 사용할 수 있다. MVP에서는 구현 난이도와 화면 활용을 고려해 다음을 권장한다.

```text
Desktop:
- 좌측 고정 사이드바 또는 상단 글로벌 네비게이션
- 메뉴: Home / Myphoto / Explore
- 우측 또는 하단에 계정 메뉴: Profile / Settings / Logout

Mobile:
- 하단 탭 또는 상단 메뉴
- 메뉴: Home / Myphoto / Explore
- 사진 올리기 CTA는 Myphoto 안에서 강조
```

## 3-2. URL 구조 권장안

```text
/                  Home
/myphoto           Myphoto 메인
/myphoto/photos/:photoId    내 사진 상세 모달/상세 상태
/myphoto/albums/:albumId    내 앨범 상세
/myphoto/upload             사진 업로드 플로우
/myphoto/albums/new         앨범 만들기 플로우
/explore            Explore 지도
/explore?photoId=   공개 사진 선택 상태
/explore?albumId=   공개 앨범 선택 상태
/profile/:handle    공개 유저 프로필
/settings           설정
```

`Login`, `Signup`, `Settings`, `Public Profile`은 필요한 페이지지만 상위 메뉴에는 넣지 않는다. 계정 메뉴, 모달, 상세 링크를 통해 접근한다.

## 3-3. 용어 정리

사용자에게 보이는 용어는 `앨범`으로 통일한다.

```text
UI 용어:
- 앨범
- 내 앨범
- 공개 앨범
- 사진
- 공개 사진

개발 내부 용어:
- 기존 코드에서 trips를 이미 사용 중이면 유지 가능
- 신규 설계에서는 albums 또는 travel_albums 사용 권장
```

기획/디자인 문서에서는 `앨범`을 기본 용어로 쓴다. 개발 DB나 API에서 `trips`를 유지하더라도 사용자 화면에는 `여행 기록`보다 `앨범`을 우선 사용한다.

---

# 4. Home

## 4-1. 목적

Home은 랜딩페이지다. 사용자가 Travelgram / Ikkyee가 무엇인지 즉시 이해하고, Myphoto에서 자신의 사진을 올리거나 Explore에서 공개 사진을 둘러보도록 유도한다.

Home은 공개 피드가 아니다. 공개 앨범과 공개 사진은 “이런 결과물이 만들어진다”는 예시 역할을 한다.

## 4-2. 핵심 메시지

```text
사진을 고르면, 여행 지도가 만들어집니다.
```

보조 카피:

```text
흩어진 여행 사진을 날짜와 위치에 따라 앨범으로 정리하고,
원할 때만 공개하거나 공유하세요.
```

## 4-3. Home 구성

```text
1. Hero 영역
   - 핵심 카피
   - 짧은 서비스 설명
   - CTA: 내 사진으로 앨범 만들기
   - 보조 CTA: Explore 둘러보기

2. 서비스 설명 영역
   - 사진 업로드
   - 위치/시간 기반 자동 정리
   - 지도와 날짜별 앨범 감상
   - 비공개 저장 / 선택 공개

3. 공개 앨범 미리보기
   - 다른 사람들이 올린 공개 앨범 카드
   - 대표 사진, 지역, 날짜, 작성자

4. 공개 사진 미리보기
   - 공개 사진 일부
   - 클릭 시 Explore 또는 공개 사진 상세로 이동

5. 로그인 상태일 때 내 최근 앨범 요약
   - 최근 만든 앨범 3~5개
   - Myphoto로 이동
```

## 4-4. 주요 버튼

```text
- 내 사진으로 앨범 만들기
- Myphoto로 이동
- Explore 둘러보기
- 로그인 / 회원가입
```

## 4-5. 비로그인 상태

비로그인 사용자는 서비스를 이해하는 것이 우선이다.

```text
비로그인 Home:
- 서비스 핵심 설명
- 공개 앨범 예시
- 공개 사진 예시
- 회원가입/로그인 CTA
```

## 4-6. 로그인 상태

로그인 사용자는 바로 자신의 작업으로 갈 수 있어야 한다.

```text
로그인 Home:
- 내 최근 앨범 요약
- 새 앨범 만들기 CTA
- 공개 앨범 예시
- Explore 이동
```

## 4-7. MVP 주의점

Home을 최신 공개 피드처럼 만들면 안 된다. 첫 화면에서 사용자가 이해해야 할 것은 “여기는 사진을 올려 지도 기반 앨범을 만드는 서비스”라는 점이다.

---

# 5. Myphoto

## 5-1. 목적

Myphoto는 사용자가 자신의 사진을 올리고, 앨범으로 만들고, 만든 앨범을 다시 보는 개인 작업 공간이다.

```text
Myphoto = 내 사진 관리 + 내 앨범 관리 + 앨범 생성 + 앨범 감상
```

이 페이지가 MVP의 중심이다.

## 5-2. Myphoto 메인 구성

```text
1. 상단 액션 영역
   - 사진 올리기
   - 앨범 만들기
   - 최근 업로드 상태

2. 최근 사진 영역
   - 최근 업로드한 내 사진
   - 위치 정보 유무 표시
   - 사진 클릭 시 상세 모달

3. 내 앨범 영역
   - 내가 만든 앨범 목록
   - 대표 사진, 제목, 날짜, 사진 수, 공개 상태
   - 앨범 클릭 시 앨범 상세

4. 위치 없는 사진 / 처리 필요 영역
   - 위치 정보 없는 사진 수
   - 수동 위치 지정 또는 GPX 매칭으로 이동
```

## 5-3. Myphoto에서 제공할 기능

```text
- 내 최근 사진 보기
- 내 앨범 보기
- 사진 업로드
- 앨범 만들기
- 사진 상세 보기
- 사진 위치 확인
- 사진 삭제
- 앨범 상세 보기
- 앨범 공개/비공개 상태 확인
- 앨범 삭제
```

## 5-4. 사진 업로드

사진 업로드는 Myphoto 안에서 시작한다.

```text
사진 올리기
→ 다중 사진 선택
→ 업로드 전 미리보기
→ 업로드 진행률 표시
→ EXIF GPS/촬영시간 파싱
→ 최근 사진에 추가
→ 앨범 만들기 제안
```

카피:

```text
선택한 사진만 업로드됩니다.
모든 사진과 앨범은 기본 비공개입니다.
```

MVP 권장 업로드 수:

```text
권장: 20~100장
상한: 200장 내외에서 경고 표시
```

## 5-5. 앨범 만들기

앨범 만들기는 두 방식으로 접근 가능하다.

```text
1. 사진 업로드 후 바로 앨범 만들기
2. Myphoto에서 기존 사진을 선택해 앨범 만들기
```

앨범 만들기 플로우:

```text
앨범 만들기
→ 사진 선택
→ EXIF 위치/시간 확인
→ 날짜별 자동 그룹
→ 위치 없는 사진 확인
→ 수동 위치 지정 또는 GPX 매칭
→ 대표 사진 선택
→ 공개 설정 확인
→ 앨범 생성
```

GPX는 시작 조건이 아니라 위치 없는 사진을 처리하는 고급 옵션이다.

## 5-6. 개별 사진 상세

개별 사진을 클릭하면 페이지 전환보다 모달 또는 드로어를 띄운다.

```text
사진 상세 모달/드로어 구성:
- 큰 사진
- 작은 지도
- 촬영 위치 핀
- 촬영 시간
- 위치 출처: EXIF / GPX / manual / unknown
- 포함된 앨범
- 공개 상태
- 삭제 또는 위치 수정
```

데스크톱 권장 레이아웃:

```text
왼쪽 65~70%: 큰 사진
오른쪽 30~35%: 작은 지도 + 메타 정보
```

모바일 권장 레이아웃:

```text
상단: 큰 사진
하단: 지도 접기/펼치기 + 메타 정보
```

## 5-7. 내 앨범 상세

내가 만든 앨범을 클릭하면 앨범 상세로 이동한다. 이 화면은 사용자가 여행 사진을 다시 감상하는 핵심 화면이다.

데스크톱 권장 레이아웃:

```text
왼쪽 60~65%: 사진 영역
오른쪽 35~40%: sticky 지도
```

사진 영역:

```text
- 구글포토식 사진 그리드
- 사진 크기에 맞춘 masonry 또는 justified grid
- 날짜별 구분선
- 날짜별 섹션 헤더
- 각 날짜 안에서 장소/좌표 클러스터 표시 가능
```

지도 영역:

```text
- 현재 앨범의 사진 위치 표시
- 현재 보고 있는 날짜의 핀 강조
- 다른 날짜 핀은 흐리게 표시 또는 숨김 토글
- 사진 클릭 시 지도 핀 강조
- 지도 핀 클릭 시 해당 사진으로 스크롤 이동
```

## 5-8. 앨범 상세 스크롤-지도 연동

앨범 상세의 핵심 인터랙션은 사진 스크롤과 지도 핀의 연동이다.

```text
사용자가 Day 1 섹션을 보고 있음
→ 지도에서 Day 1 핀 강조

사용자가 Day 2 섹션으로 스크롤 이동
→ 지도에서 Day 2 핀 강조

사용자가 특정 사진 클릭
→ 사진 상세 모달 열림
→ 지도에서 해당 핀 강조
```

지도 상태는 다음 3단계로 다룬다.

```text
1. 전체 앨범 보기
   - 모든 날짜 핀 표시
   - 날짜별 색상 또는 그룹 구분 가능

2. 활성 날짜 보기
   - 현재 스크롤 중인 날짜 핀 강조
   - 다른 날짜 핀은 흐리게 표시

3. 현재 날짜만 보기
   - 사용자가 토글을 켜면 현재 날짜 핀만 표시
```

MVP에서는 2번을 기본으로 구현하고, 3번은 구현 여유가 있으면 추가한다.

## 5-9. Myphoto 빈 상태

사진이 없는 경우:

```text
아직 올린 사진이 없어요.
여행 사진을 선택해서 첫 앨범을 만들어보세요.
```

앨범이 없는 경우:

```text
아직 만든 앨범이 없어요.
업로드한 사진으로 여행 앨범을 만들어보세요.
```

## 5-10. Myphoto 주의점

Myphoto에 다른 사람의 공개 콘텐츠를 섞지 않는다. Myphoto는 내 사진과 내 앨범만 다룬다. 공개 사진 참고는 Explore 또는 앨범 편집 중 보조 레이어로만 제공한다.

---

# 6. Explore

## 6-1. 목적

Explore는 다른 사람들이 공개한 사진을 지도에서 둘러보는 페이지다. 카드형 피드보다 지도 탐색이 중심이다.

```text
Explore = 공개 사진 지도 탐색
```

처음 진입하면 지도가 풀화면으로 보이고, 공개 사진 위치가 핀 또는 클러스터로 표시된다.

## 6-2. Explore 초기 화면

```text
- 지도 풀화면
- 현재 지도 영역 안의 공개 사진 핀
- 줌 레벨에 따른 클러스터 표시
- 검색 또는 지역 이동 기능: MVP에서는 선택 사항
- 오른쪽 사이드바는 기본적으로 닫힌 상태
```

공개 사진 핀을 클릭하면 오른쪽 사이드바가 열린다.

```text
핀 클릭
→ 오른쪽 사이드바 열림
→ 해당 위치의 사진 또는 사진 묶음 표시
→ 사진 클릭 시 큰 사진 보기
→ 앨범/작성자 프로필로 이동 가능
```

## 6-3. Explore 사이드바

데스크톱:

```text
오른쪽 사이드바
- 선택한 핀/클러스터의 사진 목록
- 큰 미리보기
- 작성자
- 앨범명
- 촬영 위치 또는 대략 위치
- 좋아요
- 앨범 보기
- 작성자 보기
```

모바일:

```text
하단 바텀시트
- 선택한 핀/클러스터의 사진 목록
- 사진 상세
- 앨범 보기
- 작성자 보기
```

## 6-4. 핀과 클러스터 정책

Explore는 공개 사진 수가 늘어날수록 지도 성능과 가독성이 중요해진다.

```text
- 낮은 줌 레벨: 클러스터 표시
- 중간 줌 레벨: 지역별 사진 수 또는 대표 썸네일 마커
- 높은 줌 레벨: 개별 사진 핀 또는 썸네일 핀
```

핀 클릭 정책:

```text
단일 사진 핀 클릭:
- 사이드바에 사진 상세 표시

클러스터 클릭:
- 지도 확대 또는 사이드바에 해당 클러스터 사진 목록 표시
```

## 6-5. 공개 사진 노출 조건

Explore에는 다음 조건을 만족하는 사진만 노출한다.

```text
- photo.visibility = public
- 해당 사진 또는 앨범의 공개 설정이 public listing 허용
- 위치 공개가 허용됨
- location_precision이 exact 또는 approximate
- 삭제되지 않음
```

위치가 hidden인 사진은 Explore 지도에 표시하지 않는다. approximate인 사진은 실제 좌표를 그대로 찍지 않고 대략 위치로 표시한다.

## 6-6. Explore에서 제공할 기능

```text
- 지도 기반 공개 사진 보기
- 공개 사진 핀/클러스터 표시
- 핀 클릭 시 오른쪽 사이드바 열기
- 사진 상세 보기
- 공개 앨범으로 이동
- 작성자 프로필로 이동
- 좋아요
- 현재 지도 영역에 결과 없음 상태 표시
```

## 6-7. Explore에서 MVP에 넣지 않을 기능

```text
- 알고리즘 추천 피드
- 인기순 랭킹
- 댓글
- DM
- 실시간 알림
- AI 여행지 추천
- 여행 코스 자동 생성
```

## 6-8. Explore 빈 상태

현재 지도 영역에 공개 사진이 없는 경우:

```text
이 지역에는 아직 공개된 사진이 없어요.
지도를 이동하거나 공개 사진이 많은 지역을 둘러보세요.
```

초기 DB가 적은 경우 Home과 Explore에 샘플 공개 앨범을 활용한다.

## 6-9. Explore 주의점

Explore는 공개 사진 소비 화면이지만, 제품의 중심은 여전히 Myphoto다. Explore가 너무 강해지면 사용자는 Travelgram / Ikkyee를 “지도 사진 구경 서비스”로만 이해할 수 있다. Home과 Myphoto의 CTA에서 내 앨범 만들기를 계속 강조해야 한다.

---

# 7. 보조 화면 / 하위 페이지 정리

상위 메뉴는 3개지만, 서비스 운영에 필요한 보조 화면은 존재한다. 다만 이들은 상위 내비게이션에서 독립 메뉴로 강조하지 않는다.

## 7-1. Login / Signup

접근 위치:

```text
- Home CTA
- Myphoto 진입 시 비로그인 상태
- 사진 업로드/앨범 만들기 시점
```

필수 기능:

```text
- 로그인
- 회원가입
- 로그아웃
- 약관 동의
- 개인정보처리방침 동의
```

## 7-2. Public Album Page

공개 앨범 상세 페이지다. Home 공개 앨범 카드, Explore 사진 사이드바, 작성자 프로필에서 진입할 수 있다.

필수 기능:

```text
- 공개 대표 사진
- 앨범 제목
- 작성자 정보
- 공개 지도
- 공개 사진 목록
- 좋아요
- 작성자 프로필 이동
- 공유
```

주의:

```text
비공개 사진, 숨긴 위치, 숨긴 촬영 시간은 절대 노출하지 않는다.
```

## 7-3. Public Photo Detail

공개 사진 한 장을 자세히 보는 화면이다. Explore에서는 별도 페이지보다 사이드바/모달로 제공하는 것을 우선한다.

필수 기능:

```text
- 큰 사진
- 작성자 정보
- 포함된 공개 앨범
- 공개 위치 정보
- 좋아요
- 앨범 이동
- 작성자 프로필 이동
```

## 7-4. Public User Profile

공개 콘텐츠 작성자의 프로필이다.

필수 기능:

```text
- 프로필 이미지
- 표시 이름
- 핸들
- 소개글
- 구독 버튼
- 공개 앨범 목록
- 공개 사진 목록
- 공개 사진 지도 보기
```

공개 프로필에는 public 콘텐츠만 노출한다. private 또는 unlisted 콘텐츠는 노출하지 않는다.

## 7-5. Liked Items / Subscriptions

이 기능들은 계정 메뉴 또는 Settings 하위에 둔다.

```text
Liked Items:
- 내가 좋아요한 공개 사진
- 내가 좋아요한 공개 앨범

Subscriptions:
- 내가 구독한 유저
- 구독한 유저의 최신 공개 앨범
```

MVP에서는 메인 탭으로 과하게 강조하지 않는다.

## 7-6. Settings

필수 기능:

```text
- 표시 이름 수정
- 프로필 이미지 수정
- 소개글 수정
- 공개 프로필 활성화 여부
- 기본 공개 정책 확인
- 로그아웃
- 계정 삭제
```

---

# 8. 핵심 사용자 플로우

## 8-1. 처음 방문한 사용자

```text
Home
→ 서비스 설명 확인
→ 공개 앨범 예시 확인
→ 내 사진으로 앨범 만들기 CTA
→ 회원가입/로그인
→ Myphoto
```

## 8-2. 내 사진 업로드 플로우

```text
Myphoto
→ 사진 올리기
→ 사진 여러 장 선택
→ 업로드 전 미리보기
→ 업로드 진행률
→ EXIF 위치/시간 파싱
→ 최근 사진에 추가
→ 앨범 만들기 제안
```

## 8-3. 앨범 만들기 플로우

```text
Myphoto
→ 앨범 만들기
→ 사진 선택
→ 날짜별 자동 그룹
→ 위치 있는 사진 지도 배치
→ 위치 없는 사진 확인
→ 수동 위치 지정 또는 GPX 매칭
→ 대표 사진 선택
→ 공개 설정 확인
→ 비공개 저장 또는 공개/공유
→ 내 앨범 상세
```

## 8-4. 내 앨범 감상 플로우

```text
Myphoto
→ 내 앨범 클릭
→ 왼쪽 사진 그리드 확인
→ 날짜별 섹션 스크롤
→ 오른쪽 지도에서 활성 날짜 핀 확인
→ 사진 클릭
→ 큰 사진 + 작은 지도 모달 확인
```

## 8-5. 공개 사진 탐색 플로우

```text
Explore
→ 지도에서 공개 사진 핀 확인
→ 핀 클릭
→ 오른쪽 사이드바 열림
→ 사진 확인
→ 공개 앨범 또는 작성자 프로필로 이동
→ 좋아요 또는 구독
```

---

# 9. MVP v1 범위

## 9-1. 반드시 포함할 기능

### 회원 기능

```text
- 회원가입
- 로그인
- 로그아웃
- 내 계정 식별
```

### Myphoto / 개인 아카이브 기능

```text
- 사진 다중 업로드
- 내 최근 사진 보기
- EXIF GPS 파싱
- EXIF 촬영 시간 파싱
- 지도 위 사진 자동 배치
- 위치 없는 사진 분리
- 위치 없는 사진 수동 위치 지정
- 앨범 만들기
- 날짜별 사진 그룹
- 장소/좌표 기반 클러스터
- 대표 사진 선택
- 내 앨범 상세
- 기본 비공개 저장
- 사진 삭제
- 앨범 삭제
```

### 사진 상세 기능

```text
- 개별 사진 큰 화면 보기
- 사진 위치 작은 지도 표시
- 촬영 시간 표시
- 위치 출처 표시
- 사진이 포함된 앨범 표시
```

### 앨범 상세 기능

```text
- 구글포토식 사진 그리드
- 날짜별 구분선
- 오른쪽 sticky 지도
- 날짜별 지도 핀 강조
- 사진 클릭 시 상세 모달
- 공유 / 공개 / 비공개 전환
```

### 공유 / 공개 기능

```text
- 공유 링크 생성
- 공개 앨범 페이지
- 공개/비공개 전환
- 공개 전 검토
- 사진별 공개 여부 설정
- 위치 정보 공개 수준 설정
- 촬영 시점 공개 수준 설정
```

### Explore 기능

```text
- 지도 풀화면
- 공개 사진 핀/클러스터 표시
- 핀 클릭 시 오른쪽 사이드바
- 사이드바에서 사진 보기
- 공개 앨범 이동
- 작성자 프로필 이동
- 좋아요
```

### 공개 유저 기능

```text
- 공개 프로필
- 작성자의 공개 앨범 목록
- 작성자의 공개 사진 목록
- 구독 / 구독 취소
```

## 9-2. MVP에서 제외할 기능

```text
- 댓글
- DM
- 실시간 알림
- 좋아요 기반 인기 랭킹
- 구독자 수 기반 랭킹
- 알고리즘 추천 피드
- AI 여행지 추천
- 여행 코스 자동 생성
- 본격적인 취향 분석
- GPS companion app
- 전체 사진첩 자동 import
- 네이티브 사진 import helper
- Garmin / Strava / Apple Health 자동 연동
- Google Timeline 계정 자동 연동
```

---

# 10. UI / 레이아웃 기준

## 10-1. 전체 내비게이션

```text
상위 메뉴:
- Home
- Myphoto
- Explore

계정 메뉴:
- Profile
- Liked Items
- Subscriptions
- Settings
- Logout
```

## 10-2. Desktop 레이아웃

Home:

```text
- Hero + CTA
- 공개 앨범 카드
- 공개 사진 미리보기
```

Myphoto:

```text
- 상단 CTA 영역
- 최근 사진 섹션
- 내 앨범 섹션
- 앨범 상세에서는 왼쪽 사진 / 오른쪽 sticky 지도
```

Explore:

```text
- 지도 풀화면
- 핀 클릭 전: 사이드바 닫힘
- 핀 클릭 후: 오른쪽 사이드바 320~420px
```

## 10-3. Mobile 레이아웃

Home:

```text
- CTA 우선
- 공개 앨범은 가로 스크롤 카드
```

Myphoto:

```text
- 사진 올리기 / 앨범 만들기 버튼 상단 고정 또는 강조
- 최근 사진과 내 앨범은 세로 리스트/그리드
- 앨범 상세에서 지도는 접기/펼치기
```

Explore:

```text
- 지도 전체 화면
- 핀 클릭 시 하단 바텀시트
- 바텀시트에서 사진 목록/상세 전환
```

---

# 11. 공개/비공개/신뢰 정책

## 11-1. 기본 원칙

```text
- 모든 사진과 앨범은 기본 비공개다.
- 사용자가 명시적으로 공개한 사진과 앨범만 공개된다.
- public 콘텐츠만 Home 공개 예시, Explore, 공개 프로필에 노출된다.
- unlisted 콘텐츠는 링크로만 접근 가능하며 Home/Explore/프로필에 노출하지 않는다.
- private 콘텐츠는 소유자만 접근 가능하다.
```

## 11-2. 공개 전 검토

공개 전 검토 화면에서는 사용자가 다음을 확인해야 한다.

```text
- 공개될 사진 목록
- 사진별 공개/비공개 토글
- 위치 정보 공개 여부
- 위치 정확도 공개 수준
- 촬영 시점 공개 여부
- 촬영 시점 정확도 공개 수준
- 원본급 이미지 공개 가능성
- 공개 후 철회 가능 여부
```

## 11-3. 위치 정보 공개 수준

```text
location_precision
- exact        // 정확한 좌표 공개
- approximate  // 대략 위치 공개
- hidden       // 위치 비공개
```

Explore에는 `exact` 또는 `approximate`로 공개가 허용된 사진만 표시한다. `hidden` 사진은 지도에 표시하지 않는다.

## 11-4. 원본 이미지 정책

```text
- 원본 파일은 기본적으로 private storage에 보관한다.
- 공개 페이지에는 public display image를 제공한다.
- public display image는 원본급 화질일 수 있으나, EXIF 메타데이터는 기본 제거한다.
- 원본 파일 다운로드는 기본 비활성화한다.
```

---

# 12. 데이터 구조 초안

## 12-1. photos

```text
photos
- id
- user_id
- album_id 또는 trip_id
- original_taken_at
- exif_lat
- exif_lng
- matched_lat
- matched_lng
- manual_lat
- manual_lng
- final_lat
- final_lng
- geo_source: exif | gpx_matched | manual | unknown
- match_confidence
- place_label
- place_confidence
- location_context: attraction_exact | attraction_nearby | transit_or_between | ordinary_place | unknown
- privacy_status: safe | needs_review_face | needs_review_text | needs_review_private_space | user_excluded
- visibility: private | public | unlisted
- original_url
- display_url
- thumbnail_url
- created_at
- updated_at
- deleted_at
```

## 12-2. albums / trips

사용자 화면에서는 `앨범`이라고 부른다. 기존 코드가 `trips`를 사용 중이면 유지 가능하다.

```text
albums 또는 trips
- id
- user_id
- title
- start_date
- end_date
- main_location_label
- map_bounds
- cover_photo_id
- visibility: private | public | unlisted
- created_from: exif | gpx | mixed | manual
- public_originals_enabled
- created_at
- updated_at
- deleted_at
```

## 12-3. album_days

앨범 상세에서 날짜별 사진 그리드와 지도 연동을 안정적으로 구현하려면 날짜 단위 그룹을 별도로 계산해둘 수 있다.

```text
album_days
- id
- album_id 또는 trip_id
- date
- start_taken_at
- end_taken_at
- photo_count
- map_bounds
- sort_order
```

## 12-4. photo_groups

장소/좌표 클러스터를 표시하기 위한 보조 구조다. MVP에서는 동적으로 계산해도 되지만, 성능상 필요하면 저장한다.

```text
photo_groups
- id
- album_id 또는 trip_id
- album_day_id
- label
- center_lat
- center_lng
- photo_count
- sort_order
```

## 12-5. public_settings

```text
public_settings
- id
- user_id
- album_id 또는 trip_id
- allow_public_listing
- allow_original_public
- allow_original_download
- allow_location_public
- location_precision: exact | approximate | hidden
- allow_time_public
- time_precision: exact | date_only | hidden
- allow_recommendation_use
- created_at
- updated_at
```

## 12-6. likes

```text
likes
- id
- user_id
- target_type: photo | album
- target_id
- created_at
```

제약:

```text
- target은 public photo 또는 public album만 허용한다.
- private/unlisted 콘텐츠에는 공개 좋아요를 제공하지 않는다.
```

## 12-7. subscriptions

```text
subscriptions
- id
- subscriber_user_id
- subscribed_user_id
- created_at
```

---

# 13. API 설계 초안

실제 API 구조는 사용하는 프레임워크와 기존 코드에 맞춰 조정한다.

## 13-1. Home

```text
GET /home/public-albums?limit=
GET /home/public-photos?limit=
GET /home/me/recent-albums
```

## 13-2. Myphoto

```text
GET  /my/photos/recent
GET  /my/albums
POST /photos/upload
GET  /photos/:photoId
PATCH /photos/:photoId
DELETE /photos/:photoId
```

## 13-3. Albums

```text
POST   /albums
GET    /albums/:albumId
PATCH  /albums/:albumId
DELETE /albums/:albumId
GET    /albums/:albumId/photos
GET    /albums/:albumId/days
POST   /albums/:albumId/photos
POST   /albums/:albumId/share-link
PATCH  /albums/:albumId/visibility
```

기존 코드가 trips를 사용한다면 `/trips`로 유지해도 된다. 다만 UI에서는 앨범으로 표시한다.

## 13-4. Processing / GPX

```text
POST /albums/:albumId/process/exif
GET  /albums/:albumId/process/result
POST /albums/:albumId/gpx/upload
POST /albums/:albumId/gpx/match
POST /albums/:albumId/time-offset
POST /photos/:photoId/location/manual
```

## 13-5. Explore

```text
GET /explore/photos?bbox=&zoom=
GET /explore/clusters?bbox=&zoom=
GET /explore/photo/:photoId
GET /explore/album/:albumId
```

## 13-6. Public

```text
GET /public/albums/:albumId
GET /public/photos/:photoId
GET /profiles/:handle
GET /profiles/:handle/albums
GET /profiles/:handle/photos
GET /profiles/:handle/map/photos
```

## 13-7. Likes / Subscriptions

```text
POST   /likes
DELETE /likes/:targetType/:targetId
GET    /likes/me
POST   /subscriptions/:userId
DELETE /subscriptions/:userId
GET    /subscriptions/me
GET    /subscriptions/me/latest-albums
```

---

# 14. 개발 우선순위

## P0. 핵심 안정화

```text
- 상위 내비게이션: Home / Myphoto / Explore
- 로그인/회원가입
- Myphoto 메인
- 사진 업로드
- EXIF GPS/촬영시간 파싱
- 최근 사진 표시
- 앨범 만들기
- 앨범 상세
- 날짜별 사진 그리드
- 오른쪽 sticky 지도
- 사진 상세 모달
- 비공개/공개 권한 처리
- 삭제 처리
```

## P1. Explore 지도

```text
- 공개 사진 지도 표시
- 핀/클러스터
- 핀 클릭 사이드바
- 공개 사진 상세
- 공개 앨범 이동
- 작성자 프로필 이동
- 위치 공개 정책 적용
```

## P2. 공개/재방문 기능

```text
- Home 공개 앨범 미리보기
- Home 공개 사진 미리보기
- 좋아요
- 공개 프로필
- 구독
- 좋아요한 항목
- 구독한 유저 최신 공개 앨범
```

## P3. 고급 옵션

```text
- GPX 업로드 기반 매칭
- 촬영 시간 오프셋 보정
- 매칭 신뢰도 표시
- 장소/관광지 confidence 표시
```

GPX는 DSLR 사용자를 위해 중요하지만, 일반 사용자의 첫 경험을 막는 조건이 되면 안 된다.

---

# 15. 배포 전 필수 체크리스트

## 15-1. Home

```text
[ ] 비로그인 사용자가 서비스가 무엇인지 5초 안에 이해할 수 있는가?
[ ] 내 사진으로 앨범 만들기 CTA가 명확한가?
[ ] 공개 앨범 예시가 피드처럼 과하게 보이지 않는가?
```

## 15-2. Myphoto

```text
[ ] 사진 업로드 실패 시 재시도할 수 있는가?
[ ] EXIF 파싱 실패 사진이 전체 플로우를 막지 않는가?
[ ] 위치 없는 사진이 버려지지 않고 따로 보이는가?
[ ] 앨범 상세에서 날짜별 구분이 명확한가?
[ ] 스크롤 위치에 따라 지도 핀이 제대로 강조되는가?
[ ] 사진 클릭 시 큰 사진과 작은 지도가 함께 보이는가?
[ ] private 앨범은 소유자만 접근 가능한가?
```

## 15-3. Explore

```text
[ ] public 사진만 지도에 표시되는가?
[ ] location hidden 사진이 지도에 표시되지 않는가?
[ ] approximate 위치가 실제 좌표를 그대로 노출하지 않는가?
[ ] 핀 클릭 시 오른쪽 사이드바가 자연스럽게 열리는가?
[ ] 공개 사진이 없는 지역의 empty state가 있는가?
[ ] 클러스터링으로 지도 성능이 유지되는가?
```

## 15-4. 공개/비공개 정책

```text
[ ] 공개 철회 후 Home/Explore/프로필에서 제거되는가?
[ ] 삭제된 사진이 공개 페이지와 지도에 남지 않는가?
[ ] 공개 이미지에서 EXIF 메타데이터가 제거되는가?
[ ] 원본 파일 URL이 public하게 노출되지 않는가?
```

---

# 16. 성공 지표

MVP에서 봐야 할 핵심 지표는 SNS 반응보다 앨범 생성과 재방문이다.

## 16-1. Myphoto 핵심 지표

```text
1. Myphoto 진입률
2. 사진 업로드 시작률
3. 업로드 완료율
4. EXIF 위치 인식률
5. 위치 없는 사진 발생률
6. 앨범 만들기 시작률
7. 앨범 생성 완료율
8. 앨범 상세 재방문율
9. 두 번째 앨범 생성률
```

## 16-2. 앨범 감상 지표

```text
1. 앨범 상세 체류 시간
2. 날짜별 스크롤 도달률
3. 사진 상세 모달 오픈률
4. 지도 핀 클릭률
5. 공유 링크 생성률
6. 공개 전환률
```

## 16-3. Explore 지표

```text
1. Explore 진입률
2. 지도 핀 클릭률
3. 사이드바 오픈률
4. 공개 사진 상세 진입률
5. 공개 앨범 진입률
6. 작성자 프로필 진입률
7. 좋아요율
8. 구독 전환율
```

---

# 17. 최종 확정 문장

```text
Travelgram / Ikkyee의 MVP 상위 페이지는 Home, Myphoto, Explore로 구성한다.

Home은 랜딩페이지로서 서비스의 정체성과 결과물 예시를 보여준다.
Myphoto는 내 사진을 업로드하고 앨범으로 만들고 다시 감상하는 개인 작업 공간이다.
Explore는 다른 사용자의 공개 사진을 지도에서 둘러보는 지도 중심 탐색 페이지다.

내 앨범 상세는 왼쪽에 구글포토식 날짜별 사진 그리드, 오른쪽에 sticky 지도를 배치한다.
사용자가 날짜별 사진 섹션을 스크롤하면 지도에는 해당 날짜의 촬영 위치가 강조된다.

개별 사진 상세는 큰 사진과 작은 지도를 함께 보여주는 모달/드로어로 제공한다.
Explore에서는 공개 사진 핀을 클릭하면 오른쪽 사이드바가 열리고, 해당 위치의 공개 사진을 볼 수 있다.

공개 기능은 포함하되 SNS화하지 않는다.
개발의 최우선 기준은 사용자가 Myphoto에서 자신의 사진을 앨범으로 만들고, 지도와 날짜 흐름으로 다시 볼 수 있는 경험이다.
```
