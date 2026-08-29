import assert from 'node:assert/strict';
import test from 'node:test';

import {
    LANDING_TAG_PAGE_SIZE,
    LANDING_TAG_PIN_LIMIT,
    filterLandingTagPhotosByRegion,
    getLandingTagFeedPhotos,
    getLandingTagPhotoPage,
    getLandingTagPhotoRegion,
    getLandingTagRegions
} from '../js/landing-tag-feed.mjs';

function photo(id, fields = {}) {
    return { id, visibility: 'public', ...fields };
}

test('landing tag feed keeps at most twenty curated photos first and shuffles the rest', () => {
    const photos = Array.from({ length: 28 }, (_, index) => photo(`p${index + 1}`, { tags: ['한국'] }));
    const section = {
        id: 'korea',
        title: '한국',
        photo_ids: Array.from({ length: 23 }, (_, index) => `p${index + 1}`)
    };

    const feed = getLandingTagFeedPhotos(section, photos, 'session-a');

    assert.equal(LANDING_TAG_PIN_LIMIT, 20);
    assert.deepEqual(feed.slice(0, 20).map((item) => item.id), section.photo_ids.slice(0, 20));
    assert.equal(feed.length, 28);
    assert.equal(new Set(feed.map((item) => item.id)).size, 28);
    assert.notDeepEqual(feed.slice(20).map((item) => item.id), photos.slice(20).map((item) => item.id));
});

test('landing tag feed is stable for one session and changes order for another session', () => {
    const photos = Array.from({ length: 12 }, (_, index) => photo(`city-${index}`, { tags: ['도시'] }));
    const section = { id: 'city', title: '도시', photo_ids: [] };

    const first = getLandingTagFeedPhotos(section, photos, 'session-a').map((item) => item.id);
    const repeated = getLandingTagFeedPhotos(section, photos, 'session-a').map((item) => item.id);
    const anotherSession = getLandingTagFeedPhotos(section, photos, 'session-b').map((item) => item.id);

    assert.deepEqual(first, repeated);
    assert.notDeepEqual(first, anotherSession);
});

test('landing tag feed includes matching or curated public photos and excludes unrelated photos', () => {
    const photos = [
        photo('pinned', { description: '파리 골목' }),
        photo('tagged', { tags: ['한국', '산'] }),
        photo('place', { placeName: '한국 서울' }),
        photo('unrelated', { tags: ['일본'] }),
        photo('private', { tags: ['한국'], visibility: 'private' })
    ];
    const feed = getLandingTagFeedPhotos({ id: 'korea', title: '한국', photo_ids: ['pinned'] }, photos, 'session');

    assert.deepEqual(new Set(feed.map((item) => item.id)), new Set(['pinned', 'tagged', 'place']));
});

test('landing tag feed falls back to shuffled public photos before AI tags exist', () => {
    const photos = [photo('a'), photo('b'), photo('c')];
    const feed = getLandingTagFeedPhotos({ id: 'korea', title: '한국', photo_ids: [] }, photos, 'session');

    assert.equal(feed.length, 3);
    assert.deepEqual(new Set(feed.map((item) => item.id)), new Set(['a', 'b', 'c']));
});

test('landing tag gallery derives concise region labels and filters without losing unlocated photos from all', () => {
    const photos = [
        photo('seoul', { country: '대한민국', placeName: '대한민국 서울 종로구' }),
        photo('busan', { city: '부산광역시', placeName: '대한민국 부산 해운대' }),
        photo('jeju', { region: '제주특별자치도' }),
        photo('japan', { placeName: '일본 교토' }),
        photo('unknown')
    ];

    assert.equal(getLandingTagPhotoRegion(photos[0]), '서울');
    assert.equal(getLandingTagPhotoRegion(photos[1]), '부산');
    assert.equal(getLandingTagPhotoRegion(photos[2]), '제주');
    assert.equal(getLandingTagPhotoRegion(photos[3]), '일본');
    assert.equal(getLandingTagPhotoRegion(photos[4]), '');
    assert.deepEqual(getLandingTagRegions(photos).map(({ label, count }) => [label, count]), [
        ['부산', 1],
        ['서울', 1],
        ['일본', 1],
        ['제주', 1]
    ]);
    assert.equal(filterLandingTagPhotosByRegion(photos, '').length, 5);
    assert.deepEqual(filterLandingTagPhotosByRegion(photos, '서울').map((item) => item.id), ['seoul']);
});

test('landing tag gallery paginates thirty photos and clamps stale pages', () => {
    const photos = Array.from({ length: 65 }, (_, index) => photo(`p${index}`, { tags: ['풍경'] }));

    assert.equal(LANDING_TAG_PAGE_SIZE, 30);
    assert.deepEqual(getLandingTagPhotoPage(photos, 1).items.map((item) => item.id), photos.slice(0, 30).map((item) => item.id));
    assert.equal(getLandingTagPhotoPage(photos, 2).items.length, 30);
    assert.equal(getLandingTagPhotoPage(photos, 99).page, 3);
    assert.equal(getLandingTagPhotoPage(photos, 99).items.length, 5);
});
