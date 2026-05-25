# Superpowers 개발 워크플로우

이 문서는 Travelgram 프로젝트에서 Codex가 작업할 때 따르는 개발 운영 원칙이다. Superpowers는 앱에 포함되는 런타임 기능이 아니라, 계획, 테스트, 디버깅, 검증, 배포를 안정적으로 진행하기 위한 작업 방식이다.

## 역할

- Codex: 코드 수정, 테스트, 빌드, 문서화, Git 작업을 수행한다.
- Superpowers: 작업 전 사고 방식과 체크포인트를 제공한다.
- Hermes Agent: 장기 실행 모니터링, 리서치, 알림, 운영 자동화에 사용한다.
- Cloudflare MCP: Pages 배포 상태, 설정, 로그, 도메인, 환경변수를 관리한다.
- Supabase MCP: 데이터베이스, RLS, Storage, Auth, advisor를 점검하고 수정한다.

## 기본 원칙

1. 모든 기능 개발과 버그 수정은 `dev` 브랜치에서 시작한다.
2. 변경 전 현재 구조를 먼저 읽고, 기존 패턴을 따른다.
3. 버그는 추측으로 바로 고치지 않고 재현 조건과 원인을 먼저 확인한다.
4. 기능 변경은 필요한 범위만 작게 수정한다.
5. Supabase, Cloudflare, GitHub처럼 서버 상태를 바꾸는 작업은 영향 범위를 확인한 뒤 진행한다.
6. 완료 전에는 변경 성격에 맞는 검증 명령을 실행한다.
7. `main` 반영은 명시 요청이 있을 때만 진행한다.

## 작업 유형별 흐름

### 기능 추가

1. 요구사항과 성공 조건을 정리한다.
2. 관련 파일과 기존 테스트를 확인한다.
3. 필요한 경우 작은 계획 문서를 `docs/superpowers/plans/`에 남긴다.
4. 테스트 가능한 로직은 먼저 테스트 케이스를 추가하거나 기존 테스트를 보강한다.
5. 구현 후 `npm test`와 `npm run build`를 실행한다.
6. `dev`에 커밋하고 푸시한다.
7. Cloudflare preview 배포가 성공했는지 확인한다.

### 버그 수정

1. 증상, 발생 조건, 기대 동작을 분리해서 적는다.
2. 관련 로그, 코드 경로, 데이터 상태를 확인한다.
3. 원인을 좁힌 뒤 최소 수정한다.
4. 회귀 테스트를 추가하거나 기존 테스트로 재현한다.
5. `npm test`와 `npm run build`를 실행한다.
6. `dev`에 커밋하고 푸시한다.

### Supabase 변경

1. 현재 테이블, RLS, Storage 정책을 MCP로 확인한다.
2. SQL 변경은 먼저 읽기/검증 쿼리로 영향 범위를 확인한다.
3. RLS, SECURITY DEFINER 함수, Storage public 정책은 보안 advisor 결과를 함께 본다.
4. 변경 후 advisor를 다시 실행한다.
5. 앱 코드와 문서를 함께 갱신한다.

### Cloudflare 변경

1. Pages 프로젝트 설정과 최근 배포 상태를 MCP로 확인한다.
2. 로컬 `wrangler.toml`, `package.json`, Cloudflare 프로젝트 설정이 일치하는지 본다.
3. `dev` 푸시는 preview 배포, `main` 푸시는 production 배포로 구분한다.
4. 배포 실패 시 logs를 먼저 확인하고 원인을 기록한다.

## 검증 명령

일반 코드 변경:

```bash
npm test
npm run build
```

Cloudflare preview 확인:

```bash
git push
```

푸시 후 Cloudflare Pages에서 `dev` preview 배포가 성공했는지 확인한다.

## 완료 기준

- 변경 파일이 의도한 범위 안에 있다.
- 테스트와 빌드가 통과했다.
- 서버 설정 변경이 필요한 경우 MCP로 실제 상태를 확인했다.
- `dev` 브랜치에 커밋되어 있다.
- 사용자가 요청하지 않은 `main` 배포는 하지 않았다.
