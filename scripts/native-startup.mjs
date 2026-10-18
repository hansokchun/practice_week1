import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

export function createNativeStartupPlugin() {
    return {
        name: 'ikkyee-native-startup',
        apply: 'build',
        transformIndexHtml: {
            order: 'pre',
            handler(html) {
                const landing = /\s*<section id="page-landing"[\s\S]*?<\/section>/;
                if (!landing.test(html)) throw new Error('Native landing boundary changed; review the entry transform.');
                html = html.replace(landing, '')
                    .replace('<html lang="ko">', '<html lang="ko" class="native-app">')
                    .replace('data-page="landing"', 'data-page="home"')
                    .replace('id="page-home" class="page page-home"', 'id="page-home" class="page page-home active"')
                    .replace('href="#/landing" data-route="landing" aria-label="Ikkyee 이끼 landing"',
                        'href="#/" data-route="home" aria-label="Ikkyee 이끼 메인"')
                    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^/]+\/dist\/umd\/supabase.min.js/,
                        './native-supabase.js')
                    .replace('<p id="auth-message"', '<button id="btn-native-guest" class="auth-link-button" type="button">로그인 없이 둘러보기</button>\n            <p id="auth-message"')
                    .replace(/(<body[^>]*>)/, `$1
    <div id="native-startup" role="status" aria-live="polite" aria-label="이끼 시작 중">
        <div class="native-startup-brand">
            <img src="images/logo.png" alt="" width="256" height="256">
            <span class="native-startup-wordmark">Ikkyee</span>
            <span class="native-startup-caption">사진에서 시작되는 여행</span>
            <span class="native-startup-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <p id="native-startup-message">로그인 없이 사진과 장소를 둘러보세요</p>
        <div id="native-startup-recovery" hidden><button id="native-startup-retry" type="button">다시 연결하기</button></div>
    </div>`);
                return { html, tags: [
                    { tag: 'link', attrs: { rel: 'stylesheet', href: './native-startup.css' }, injectTo: 'head' },
                    { tag: 'script', attrs: { src: './native-startup.js', defer: true }, injectTo: 'head' }
                ] };
            }
        },
        generateBundle() {
            for (const name of ['native-startup.css', 'native-startup.js']) {
                this.emitFile({ type: 'asset', fileName: name,
                    source: readFileSync(new URL(`../app-shell/runtime/${name}`, import.meta.url)) });
            }
            // Same pinned SDK as the website, but available without a CDN round trip.
            const root = dirname(require.resolve('@supabase/supabase-js/package.json'));
            this.emitFile({ type: 'asset', fileName: 'native-supabase.js',
                source: readFileSync(join(root, 'dist/umd/supabase.js')) });
        }
    };
}
