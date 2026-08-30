import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(readFileSync('store-public-pages.json', 'utf8'));

test('store-facing public URLs are stable and keep unapproved contact details blocked', () => {
    assert.equal(contract.origin, 'https://practice-week1-cws.pages.dev');
    assert.deepEqual(contract.paths, {
        privacy: '/privacy/',
        support: '/support/',
        accountDeletion: '/account-deletion/'
    });
    assert.equal(contract.supportContact.status, 'operator-approval-required');
    assert.equal(contract.supportContact.email, null);
});

test('privacy, support, and deletion pages expose truthful user controls', () => {
    const privacy = readFileSync('public/privacy/index.html', 'utf8');
    const support = readFileSync('public/support/index.html', 'utf8');
    const deletion = readFileSync('public/account-deletion/index.html', 'utf8');

    assert.match(privacy, /Ikkyee 개인정보 처리방침/u);
    assert.match(privacy, /자동으로 업로드하지 않/u);
    assert.match(privacy, /Supabase/u);
    assert.match(privacy, /Google Maps/u);
    assert.match(privacy, /판매하지 않/u);
    assert.match(privacy, /href="\/account-deletion\/"/u);

    assert.match(support, /Ikkyee 지원/u);
    assert.match(support, /data-support-contact-status/u);
    assert.match(support, /비밀번호.*액세스 토큰.*비공개 사진 링크/u);

    assert.match(deletion, /Ikkyee 계정 삭제/u);
    assert.match(deletion, /href="\/#\/profile"/u);
    assert.match(deletion, /앱을 다시 설치할 필요/u);
    assert.match(deletion, /기기의 원본 사진은 삭제하지 않/u);
});

test('the main site footer links every store-facing resource', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const href of Object.values(contract.paths)) {
        assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'u'));
    }
});
