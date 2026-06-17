import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('home page includes a Stitch-inspired minimal landing shell', () => {
    assert.match(html, /class="home-minimal-shell"/);
    assert.match(html, /여행 사진을 올리면, 기억이 지도 위에서 다시 선명해집니다/);
    assert.match(html, /공개 사진을 지도에서 발견/);
    assert.match(html, /사진에서 지도까지, 세 단계로 충분합니다/);
});

test('home primary CTA ids are unique after replacing the old hero surface', () => {
    assert.equal((html.match(/id="btn-home-explore"/g) || []).length, 1);
    assert.equal((html.match(/id="btn-home-myphoto"/g) || []).length, 1);
});

test('minimal home styles hide the previous guest marketing sections', () => {
    assert.match(css, /\.page-home > \.hero[\s\S]*display: none/);
    assert.match(css, /\.home-minimal-cards/);
    assert.match(css, /body\.is-logged-in \.home-minimal-shell/);
});

test('logged-in home workspace copy is normalized after rendering', () => {
    assert.match(app, /function normalizeHomeStaticCopy\(\)/);
    assert.match(app, /내 사진과 앨범을 정리하는 공간/);
    assert.match(app, /normalizeHomeStaticCopy\(\);/);
});
