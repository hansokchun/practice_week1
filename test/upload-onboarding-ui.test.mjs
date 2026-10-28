import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('the upload invitation renders its explanation and a clear map CTA', () => {
    assert.match(app, /account-notification-body/);
    assert.match(app, /account-notification-cta/);
    assert.match(app, /item\.featured \? ' is-map-invitation' : ''/);
    assert.match(css, /\.account-notification-item\.is-map-invitation\s*\{/);
    assert.match(css, /\.account-notification-cta\s*\{/);
});

test('the photo upload experience presents a visible, concise three-step path', () => {
    const pageStart = html.indexOf('id="page-upload"');
    const pageEnd = html.indexOf('id="page-upload-complete"', pageStart);
    const uploadPage = html.slice(pageStart, pageEnd);

    assert.match(uploadPage, /나만의 지도 만들기/);
    assert.match(uploadPage, /class="upload-step-list" aria-label="사진 등록 3단계"/);
    assert.equal((uploadPage.match(/class="upload-step"/g) || []).length, 3);
    assert.match(uploadPage, /사진 고르기/);
    assert.match(uploadPage, /장소 확인/);
    assert.match(uploadPage, /지도에 저장/);
    assert.match(css, /\.upload-step-list\s*\{[\s\S]*display:\s*grid;/);
    assert.doesNotMatch(css, /#btn-upload-retry,\s*\.upload-step-list\s*\{\s*display:\s*none;/);
});
