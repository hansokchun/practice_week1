import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAdminModerationDraft, renderAdminAccountRows, renderAdminAccountDetail } from '../js/admin-accounts.mjs';

test('moderation drafts validate actions and preserve the required reason', () => {
    assert.deepEqual(getAdminModerationDraft({ operation: 'ban', reason: '  반복된 스팸 게시  ', durationHours: '168' }), { operation: 'ban', reason: '반복된 스팸 게시', durationHours: 168 });
    assert.equal(getAdminModerationDraft({ operation: 'delete', reason: '테스트 사유' }), null);
    assert.equal(getAdminModerationDraft({ operation: 'warning', reason: ' ' }), null);
    assert.equal(getAdminModerationDraft({ operation: 'ban', reason: '테스트 사유', durationHours: 99 }), null);
});
test('account rows escape identity and clearly separate login history from presence', () => {
    const html = renderAdminAccountRows([{ id: 'a', nickname: '<script>', email: 'x@example.com', photo_count: 12, public_count: 5 }]);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /12/);
    assert.doesNotMatch(html, /접속 중|온라인|<script>/);
});
test('details render inspectable derivatives, counts, and moderation without exposing originals', () => {
    const uploadedAt = '2026-10-31T03:00:00.000Z';
    const html = renderAdminAccountDetail({ account: { id: 'a', nickname: '회원', photo_count: 12, public_count: 5 }, photos: [{ id: 'p', title: '<img>', visibility: 'private', created_at: uploadedAt, thumbnailUrl: 'https://example.com/thumb.jpg?token=a&b=c', url: 'https://example.com/original.jpg', latitude: 37.12345, longitude: 127.12345 }], history: [] });
    assert.match(html, /thumb\.jpg/);
    assert.match(html, /token=a&amp;b=c/);
    assert.match(html, /width="96" height="96"/);
    assert.match(html, /alt="&lt;img&gt;"/);
    assert.match(html, /<figcaption>(?:(?!<\/figcaption>)[\s\S])*&lt;img&gt;/);
    assert.match(html, /<time datetime="2026-10-31T03:00:00\.000Z"[^>]*>2026\. 10\. 31\.<\/time>/);
    assert.match(html, /aria-label="업로드일 2026\. 10\. 31\."/);
    assert.match(html, /비공개/);
    assert.doesNotMatch(html, /original\.jpg|37\.12345|127\.12345|<img>|figcaption class="sr-only"/);
    assert.match(html, /data-admin-moderate="warning"/);
    assert.match(html, /data-admin-moderate="ban"/);
});

test('photo captions distinguish visibility and retain readable missing-thumbnail metadata', () => {
    const html = renderAdminAccountDetail({ photos: [
        { title: '공개 사진', visibility: 'public', created_at: '2026-10-30T03:00:00Z' },
        { title: '링크 사진', visibility: 'link', created_at: '2026-10-29T03:00:00Z' },
        { title: '', visibility: 'private', created_at: 'invalid' },
    ] });
    const figures = html.match(/<figure[\s\S]*?<\/figure>/g);
    assert.equal(figures.length, 3);
    assert.match(figures[0], /<figcaption>[\s\S]*>공개<\/span>/);
    assert.match(figures[1], /<figcaption>[\s\S]*>링크공개<\/span>/);
    assert.doesNotMatch(figures[1], /비공개/);
    assert.match(figures[2], /제목 없음/);
    assert.match(figures[2], /비공개/);
    assert.match(figures[2], /업로드일 확인 불가/);
    assert.doesNotMatch(figures[2], /datetime=|Invalid Date/);
    for (const figure of figures) assert.match(figure, /aria-label="미리보기 없음"/);
});

test('photo inspection preserves the empty account state', () => {
    assert.match(renderAdminAccountDetail(), /등록된 사진이 없습니다\./);
});
test('administrator pages have dedicated guarded account and feedback routes', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    assert.match(html, /id="btn-edit-landing"[^>]*>[\s\S]*?관리자페이지/);
    assert.match(html, /id="page-admin-accounts"/);
    assert.match(html, /id="page-admin-feedback"/);
    assert.match(html, /id="admin-moderation-form"/);
    assert.match(app, /normalized\.startsWith\('admin-'\)/);
});
