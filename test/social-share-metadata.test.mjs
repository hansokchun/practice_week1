import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('the app shell exposes a Kakao-friendly social preview', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.match(html, /<link rel="canonical" href="https:\/\/ikkyee\.com\/">/);
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.match(html, /<meta property="og:title" content="이끼 \| 장소 저장소">/);
    assert.match(html, /<meta property="og:site_name" content="이끼">/);
    assert.match(html, /<meta property="og:locale" content="ko_KR">/);
    assert.match(html, /<meta property="og:description" content="[^"]+">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/ikkyee\.com\/">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/ikkyee\.com\/social-preview\.jpg">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});

test('search and social metadata explain the Korean place archive consistently', () => {
    const html = readFileSync('index.html', 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';
    const description = '이끼는 사진 속 장소를 찾고, 저장하고, 공유하는 장소 저장소입니다. 마음에 드는 장소를 지도에 차곡차곡 모아보세요.';

    assert.match(html, /<html lang="ko">/);
    assert.deepEqual([...head.matchAll(/<title>([^<]+)<\/title>/g)].map((match) => match[1]), ['이끼 | 장소 저장소']);
    for (const selector of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
        assert.ok(head.includes(`<meta ${selector} content="${description}">`));
    }
    assert.match(head, /<meta name="twitter:title" content="이끼 \| 장소 저장소">/);
    assert.match(head, /<meta name="twitter:image" content="https:\/\/ikkyee\.com\/social-preview\.jpg">/);
    assert.doesNotMatch(head, /Personal Travel Map Archive|practice-week1-cws\.pages\.dev/);
});

test('the homepage declares one valid WebSite identity on the production canonical URL', () => {
    const html = readFileSync('index.html', 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || '';
    const websites = [...head.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
        .map((match) => JSON.parse(match[1]))
        .filter((entry) => entry['@type'] === 'WebSite');

    assert.equal(websites.length, 1);
    assert.equal(websites[0]['@context'], 'https://schema.org');
    assert.equal(websites[0].name, '이끼');
    assert.ok([websites[0].alternateName].flat().includes('Ikkyee'));
    assert.equal(websites[0].url, 'https://ikkyee.com/');
    assert.equal(websites[0].inLanguage, 'ko-KR');
});
