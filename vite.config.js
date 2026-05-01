import { defineConfig } from 'vite';

export default defineConfig({
    // index.html이 프로젝트 루트에 있으므로 root는 기본값(.) 사용
    build: {
        outDir: 'dist',
        // CDN 라이브러리들은 번들에 포함하지 않음 (전역 변수로 접근)
        rollupOptions: {
            // js/app.js가 index.html에서 type="module"로 로드되므로 별도 entry 불필요
        }
    },
    server: {
        open: true // 개발 서버 시작 시 브라우저 자동 열기
    }
});
