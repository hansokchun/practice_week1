import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAlbumReviewRowLayout, getAlbumReviewDaySections } from '../js/album-review-layout.mjs';

test('getAlbumReviewDaySections groups photos by capture date and balances rows between two and four photos', () => {
    const sections = getAlbumReviewDaySections([
        { id: 'p6', date: '2026-05-13T09:00:00Z', width: 1200, height: 800 },
        { id: 'p1', date: '2026-05-12T09:00:00Z', width: 1600, height: 900 },
        { id: 'p2', date: '2026-05-12T10:00:00Z', width: 900, height: 1200 },
        { id: 'p3', date: '2026-05-12T11:00:00Z', width: 1200, height: 1200 },
        { id: 'p4', date: '2026-05-12T12:00:00Z', width: 1400, height: 900 },
        { id: 'p5', date: '2026-05-12T13:00:00Z', width: 900, height: 900 }
    ]);

    assert.equal(sections.length, 2);
    assert.equal(sections[0].dateLabel, '5\uC6D4 12\uC77C');
    assert.deepEqual(sections[0].rows.map((row) => row.map((photo) => photo.id)), [
        ['p1', 'p2', 'p3'],
        ['p4', 'p5']
    ]);
    assert.deepEqual(sections[0].rows[0].map((photo) => photo.aspectRatio), [1.78, 0.75, 1]);
    assert.equal(sections[1].dateLabel, '5\uC6D4 13\uC77C');
    assert.deepEqual(sections[1].rows.map((row) => row.map((photo) => photo.id)), [['p6']]);
});

test('getAlbumReviewDaySections falls back to created date and keeps undated photos in a final section', () => {
    const sections = getAlbumReviewDaySections([
        { id: 'created', created_at: '2026-05-14T08:00:00Z' },
        { id: 'missing' }
    ]);

    assert.deepEqual(sections.map((section) => section.dateLabel), ['5\uC6D4 14\uC77C', '\uB0A0\uC9DC \uC5C6\uC74C']);
    assert.deepEqual(sections[1].rows.map((row) => row.map((photo) => photo.id)), [['missing']]);
});

test('getAlbumReviewDaySections never mixes different dates in the same photo row', () => {
    const sections = getAlbumReviewDaySections([
        { id: 'day-1', date: '2026-05-12T09:00:00Z' },
        { id: 'day-2', date: '2026-05-13T09:00:00Z' },
        { id: 'day-3', date: '2026-05-14T09:00:00Z' }
    ]);

    assert.deepEqual(sections.map((section) => section.dateLabel), ['5\uC6D4 12\uC77C', '5\uC6D4 13\uC77C', '5\uC6D4 14\uC77C']);
    assert.deepEqual(sections.map((section) => section.rows.map((row) => row.map((photo) => photo.id))), [
        [['day-1']],
        [['day-2']],
        [['day-3']]
    ]);
});

test('calculateAlbumReviewRowLayout keeps a shared row height and scales widths by photo ratio', () => {
    const layout = calculateAlbumReviewRowLayout(
        [{ aspectRatio: 1.8 }, { aspectRatio: 0.75 }, { aspectRatio: 1 }],
        1000,
        { gap: 6, minHeight: 190, maxHeight: 320 }
    );

    assert.equal(layout.height, 278);
    assert.deepEqual(layout.widths, [500, 209, 278]);
});

test('calculateAlbumReviewRowLayout caps oversized rows but still keeps landscape photos wider', () => {
    const layout = calculateAlbumReviewRowLayout(
        [{ aspectRatio: 1.8 }, { aspectRatio: 0.75 }],
        1200,
        { gap: 6, minHeight: 190, maxHeight: 320 }
    );

    assert.equal(layout.height, 320);
    assert.deepEqual(layout.widths, [576, 240]);
});
