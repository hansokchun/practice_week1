import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getLandingSearchQueryParts,
    getLandingSearchResults,
    isLandingConceptSearch
} from '../js/landing-sections.mjs';

test('landing search normalizes Unicode and Korean spacing while retaining AND matching and ranking', () => {
    const photos = [
        { id: 'exact', visibility: 'public', title: '제주 바다', tags: ['길'] },
        { id: 'synonym', visibility: 'public', title: '제주바다', ai_tags: ['도로'] },
        { id: 'partial', visibility: 'public', title: '제주 바다' }
    ];

    assert.deepEqual(getLandingSearchResults(photos, '제주바다').map(({ id }) => id), ['exact', 'synonym', 'partial']);
    assert.deepEqual(getLandingSearchResults(photos, '  제주　바다　길  ').map(({ id }) => id), ['exact', 'synonym']);
    assert.deepEqual(getLandingSearchResults([
        { id: 'exact-night', visibility: 'public', title: 'New York Night' },
        { id: 'exact-road', visibility: 'public', title: 'new york road' },
        { id: 'synonym-road', visibility: 'public', title: 'NEW YORK', ai_scene: 'road' }
    ], 'ＮＥＷ　ＹＯＲＫ　ＲＯＡＤ').map(({ id }) => id), ['exact-road', 'synonym-road']);
});

test('landing search consistently excludes explicit non-public visibility even when legacy shared is true', () => {
    const photos = [
        { id: 'public', visibility: 'public', title: '바다' },
        { id: 'legacy', shared: true, title: '바다' },
        { id: 'private', shared: true, visibility: 'private', title: '바다' },
        { id: 'link', shared: true, visibility: 'link', title: '바다' },
        { id: 'null-visibility', shared: true, visibility: null, title: '바다' }
    ];

    assert.deepEqual(getLandingSearchResults(photos, '바다').map(({ id }) => id), ['public', 'legacy']);
});

test('landing search recognizes local people and scene topics without guessing geographic queries', () => {
    assert.equal(isLandingConceptSearch('people person'), true);
    assert.deepEqual(getLandingSearchQueryParts('city'), { locationQuery: '', textQuery: 'city' });
    assert.deepEqual(getLandingSearchQueryParts('도시'), { locationQuery: '', textQuery: '도시' });
    assert.deepEqual(getLandingSearchQueryParts('사람 / 바다'), { locationQuery: '', textQuery: '사람 바다' });
    assert.deepEqual(getLandingSearchQueryParts('제주 바다 야경'), { locationQuery: '제주', textQuery: '바다 야경' });
    assert.deepEqual(getLandingSearchQueryParts('서울 야경'), { locationQuery: '서울', textQuery: '야경' });
    assert.deepEqual(getLandingSearchQueryParts('Ｎｅｗ　Ｙｏｒｋ　ＮＩＧＨＴ'), { locationQuery: 'New York', textQuery: 'night' });
    assert.deepEqual(getLandingSearchQueryParts('산 호세'), { locationQuery: '산 호세', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('Mountain View'), { locationQuery: 'Mountain View', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('Mexico City'), { locationQuery: 'Mexico City', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('Mexico City night'), { locationQuery: 'Mexico City', textQuery: 'night' });
    assert.deepEqual(getLandingSearchQueryParts('Abbey Road'), { locationQuery: 'Abbey Road', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('Central Park'), { locationQuery: 'Central Park', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('Lake District'), { locationQuery: 'Lake District', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('올림픽 공원'), { locationQuery: '올림픽 공원', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('서울 역'), { locationQuery: '서울 역', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('한라 산'), { locationQuery: '한라 산', textQuery: '' });
    assert.deepEqual(getLandingSearchQueryParts('서울 #공원'), { locationQuery: '서울', textQuery: '공원' });
    assert.deepEqual(getLandingSearchQueryParts('제주 #숲'), { locationQuery: '제주', textQuery: '숲' });
});
