# Cloudflare Pages 운영 메모

이 프로젝트는 Cloudflare Pages 프로젝트 `practice-week1`에 연결되어 있다.

## 연결 상태

- GitHub 저장소: `hansokchun/practice_week1`
- Cloudflare Pages 프로젝트: `practice-week1`
- Production 브랜치: `main`
- Preview 배포: `dev`를 포함한 production 외 브랜치
- Build command: `npm run build`
- Build output directory: `dist`

## 기본 배포 흐름

로컬 작업은 `dev` 브랜치에서 진행한다.

```bash
git add .
git commit -m "작업 내용"
git push
```

`dev`에 푸시하면 Cloudflare Pages preview 배포가 생성된다.

검증 후 production에 반영할 때는 `main`으로 병합하고 푸시한다.

```bash
git switch main
git merge dev
git push origin main
git switch dev
```

`main`에 푸시하면 Cloudflare Pages production 배포가 생성된다.

## 직접 배포

GitHub 자동 배포 대신 Wrangler로 직접 업로드할 수도 있다.

```bash
npm run cf:deploy:dev
npm run cf:deploy:main
```

일반적인 작업에서는 GitHub 푸시 기반 자동 배포를 우선 사용한다.
