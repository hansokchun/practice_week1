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
test('details render tiny derivatives, counts, and moderation without exposing originals', () => {
    const html = renderAdminAccountDetail({ account: { id: 'a', nickname: '회원', photo_count: 12, public_count: 5 }, photos: [{ id: 'p', title: '<img>', visibility: 'private', thumbnailUrl: 'https://example.com/thumb.jpg', url: 'https://example.com/original.jpg' }], history: [] });
    assert.match(html, /thumb\.jpg/);
    assert.match(html, /width="48" height="48"/);
    assert.match(html, /비공개/);
    assert.doesNotMatch(html, /original\.jpg|<img>/);
    assert.match(html, /data-admin-moderate="warning"/);
    assert.match(html, /data-admin-moderate="ban"/);
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
