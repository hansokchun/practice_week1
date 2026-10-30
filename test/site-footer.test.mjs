import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const footer = html.match(/<footer class="site-footer"[\s\S]*?<\/footer>/)?.[0] || '';

test('the compact footer retains every service, support and policy destination', () => {
    const links = [...footer.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)]
        .map(([, href, label]) => [href, label]);

    assert.deepEqual(links, [
        ['#/', '메인'],
        ['#/explore', '지도'],
        ['/privacy/', '개인정보 처리방침'],
        ['/support/', '고객지원'],
        ['/artwork/photo-credits.html', '사진 출처'],
        ['/account-deletion/', '계정 삭제 안내'],
        ['/privacy/#analytics', '방문 통계 안내']
    ]);
    assert.match(footer, /<nav class="site-footer__nav" aria-label="둘러보기">\s*<ul>/);
    assert.match(footer, /<nav class="site-footer__nav" aria-label="안내 및 정책">\s*<ul>/);
});

test('footer copy stays concise while keeping its accessible brand heading and copyright', () => {
    assert.match(footer, /aria-labelledby="site-footer-title"/);
    assert.match(footer, /<h2 id="site-footer-title">이끼 <span>장소 저장소<\/span><\/h2>/);
    assert.match(footer, /장소를 발견하고, 저장하고, 나눠요\./);
    assert.match(footer, /© 2026 이끼 · 장소 저장소\./);
    assert.doesNotMatch(footer, /site-footer__notes|내 사진은 기본 비공개|공개한 사진만 지도|사진 위치는 정확한 위치/);
});

test('footer links stay readable and reachable in a compact responsive layout', () => {
    assert.match(css, /\.site-footer\s*\{[^}]*border-top: 1px solid var\(--line\);[^}]*background: var\(--bg\);/s);
    assert.match(css, /\.site-footer__nav a\s*\{[^}]*min-height: 44px;/s);
    assert.match(css, /\.site-footer__nav ul\s*\{[^}]*flex-wrap: wrap;/s);
    assert.match(css, /\.site-footer__nav a:focus-visible\s*\{[^}]*outline: 2px solid var\(--teal\);/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*?\.site-footer__inner\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    assert.match(css, /body\[data-page="home"\] \.site-footer\s*\{[^}]*padding-bottom: calc\(104px \+ env\(safe-area-inset-bottom, 0px\)\);/s);
});
