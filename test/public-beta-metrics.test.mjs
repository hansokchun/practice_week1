import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const metrics = () => readFileSync('docs/product/public-beta-metrics-2026-07-26.md', 'utf8');
const queries = () => readFileSync('scripts/report-public-beta-metrics.sql', 'utf8');
const checklist = () => readFileSync('docs/product/public-beta-launch-checklist-2026-07-22.md', 'utf8');

test('public beta metrics define the five launch signals', () => {
    const source = metrics();

    assert.match(source, /Sign-up/);
    assert.match(source, /First upload/);
    assert.match(source, /First album/);
    assert.match(source, /First publish/);
    assert.match(source, /Explore engagement/);
});

test('metrics use first-party aggregate records without client tracking', () => {
    const source = metrics();

    assert.match(source, /No client analytics SDK/i);
    assert.match(source, /No analytics cookies/i);
    assert.match(source, /No new event table/i);
    assert.match(source, /aggregate/i);
});

test('metrics policy excludes sensitive content and suppresses small cohorts', () => {
    const source = metrics();

    assert.match(source, /email/i);
    assert.match(source, /IP address/i);
    assert.match(source, /exact or approximate coordinates/i);
    assert.match(source, /photo URLs/i);
    assert.match(source, /fewer than 5/i);
});

test('operator query emits aggregate cohort metrics from existing tables', () => {
    const source = queries();

    assert.match(source, /auth\.users/);
    assert.match(source, /public\.photos/);
    assert.match(source, /public\.albums/);
    assert.match(source, /public\.user_likes/);
    assert.match(source, /first_upload_rate_pct/);
    assert.match(source, /first_album_rate_pct/);
    assert.match(source, /first_publish_rate_pct/);
    assert.match(source, /explore_engagement_rate_pct/);
    assert.doesNotMatch(source, /select\s+\*/i);
});

test('public beta checklist marks privacy-conscious metrics complete', () => {
    assert.match(
        checklist(),
        /- \[x\] Define privacy-conscious beta metrics: sign-up, first upload, first album, first publish, and Explore engagement\./
    );
});
