import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { compactPiexifPlugin } from './scripts/compact-piexif.mjs';
import { createNativeContentSecurityPlugin } from './scripts/native-content-security.mjs';
import { createNativeBrandDownloadsPlugin } from './scripts/native-brand-downloads.mjs';

export default defineConfig(({ mode }) => {
    const native = mode === 'native';
    return {
        base: native ? './' : '/',
        plugins: [compactPiexifPlugin(), ...(native ? [createNativeContentSecurityPlugin(), createNativeBrandDownloadsPlugin()] : [])],
        resolve: {
            alias: native ? [] : ['native-app-runtime', 'native-auth-bridge', 'native-auth-storage',
                'native-api-fetch', 'native-content-actions', 'native-external-links'].map(name => ({
                find: new RegExp(`^(?:.*\\/)?${name}\\.mjs$`),
                replacement: fileURLToPath(new URL('./js/web-native-adapters.mjs', import.meta.url))
            }))
        },
        // index.html이 프로젝트 루트에 있으므로 root는 기본값(.) 사용
        build: {
            outDir: native ? 'app-shell/www' : 'dist',
            // CDN 라이브러리들은 번들에 포함하지 않음 (전역 변수로 접근)
            rollupOptions: {
                // js/app.js가 index.html에서 type="module"로 로드되므로 별도 entry 불필요
            }
        },
        server: {
            // Native exports must not reload the web app or repeat its backend reads.
            watch: { ignored: ['**/mobile/**', '**/app-shell/**'] },
            open: true // 개발 서버 시작 시 브라우저 자동 열기
        }
    };
});
