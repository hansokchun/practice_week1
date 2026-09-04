import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    LANDING_SLIDE_INTERVAL_MS,
    getNextLandingSlideIndex
} from '../js/landing-slideshow.mjs';
import { normalizeLandingHeroLocationLabel } from '../js/landing-location-label.mjs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const auth = readFileSync('auth.js', 'utf8');
const migration = readFileSync('supabase/migrations/20260904100942_add_landing_hero_curation.sql', 'utf8');
const optimizedRlsMigration = readFileSync('supabase/migrations/20260904101737_optimize_landing_hero_rls.sql', 'utf8');
const locationLabelMigration = readFileSync('supabase/migrations/20260904160708_add_landing_hero_location_labels.sql', 'utf8');
const simplifiedLocationMigration = readFileSync('supabase/migrations/20260904223704_simplify_landing_hero_locations.sql', 'utf8');

test('the first route renders a dedicated full-screen landing before the existing main page', () => {
    assert.match(html, /id="page-landing" class="page page-landing active"/);
    assert.match(html, /id="page-home" class="page page-home"/);
    assert.doesNotMatch(html, /class="site-primary-nav"/);
    assert.match(html, /data-landing-enter[^>]*data-route="home"/);
    assert.match(app, /if \(!hash\) return LANDING_ROUTE;/);
    assert.match(app, /const hash = normalized === LANDING_ROUTE \? '#\/landing' : normalized === APP_SECTIONS\.HOME \? '#\/'/);
});

test('landing waits for curated photos instead of flashing sample slides', () => {
    const landingStart = html.indexOf('id="page-landing"');
    const landingEnd = html.indexOf('id="page-home"', landingStart);
    const landing = html.slice(landingStart, landingEnd);
    assert.match(landing, /class="landing-hero-slides"[^>]*aria-busy="true"[^>]*><\/div>/);
    assert.doesNotMatch(landing, /class="landing-hero-slide(?:\s|")/);
    assert.match(html, /<h1[^>]*>이 사진은 어디서 찍은거지\?<\/h1>/);
    assert.match(html, /<p>이끼에서 매력적인 장소와 자세한 위치를 찾아보세요<\/p>/);
    assert.match(css, /\.page-landing\s*\{[^}]*min-height:\s*100svh;/s);
    assert.match(css, /\.landing-hero-slide img\s*\{[^}]*object-fit:\s*cover;/s);
    assert.match(css, /\.landing-hero-content\s*\{[^}]*top:\s*46%;/s);
    assert.match(css, /\.landing-hero-content h1\s*\{[^}]*font-size:\s*56px;/s);
    assert.match(css, /\.landing-hero-content p\s*\{[^}]*margin:\s*34px 0 0;/s);
    assert.match(css, /body\[data-page="landing"\]\s+\.site-header\s*\{[^}]*background:\s*transparent;/s);
});

test('landing slideshow advances every five seconds and wraps around', () => {
    assert.equal(LANDING_SLIDE_INTERVAL_MS, 5_000);
    assert.equal(getNextLandingSlideIndex(0, 5), 1);
    assert.equal(getNextLandingSlideIndex(4, 5), 0);
    assert.equal(getNextLandingSlideIndex(2, 0), 0);
    assert.doesNotMatch(app, /prefers-reduced-motion[^\n]+return/);
});

test('admins can select and order up to five server photos for the landing slideshow', () => {
    assert.match(html, /id="landing-admin-hero"/);
    assert.match(html, /id="landing-admin-hero-photos"/);
    assert.match(app, /function renderLandingAdminHeroForm\(\)/);
    assert.match(app, /function renderLandingHeroSlides\(\)/);
    assert.match(app, /saveLandingHeroSlides\(getLandingHeroSlidesToSave\(\)\)/);
    assert.match(auth, /from\('landing_hero_photos'\)/);
    assert.match(auth, /LANDING_HERO_PHOTO_SELECT_COLUMNS = 'photo_id,sort_order,location_label'/);
    assert.match(auth, /location_label:\s*String\(slide\?\.locationLabel/);
    assert.match(migration, /create table if not exists public\.landing_hero_photos/i);
    assert.match(migration, /alter table public\.landing_hero_photos enable row level security/i);
    assert.match(migration, /coalesce\(auth\.jwt\(\) -> 'app_metadata' ->> 'role', ''\) = 'admin'/i);
    assert.match(optimizedRlsMigration, /coalesce\(\(select auth\.jwt\(\)\) -> 'app_metadata' ->> 'role', ''\) = 'admin'/i);
    assert.match(locationLabelMigration, /add column if not exists location_label text/i);
    assert.match(locationLabelMigration, /가가와 도노쇼/);
    assert.match(app, /data-admin-hero-location-label=/);
});

test('landing footer opens the active photo detail from its centered location label', () => {
    assert.match(html, /<button id="landing-hero-caption"[^>]*data-landing-caption-photo-id[^>]*>[\s\S]*?location_on[\s\S]*?data-landing-caption-place[\s\S]*?<\/button>/);
    assert.doesNotMatch(html, /data-landing-caption-position|data-landing-slide-position/);
    assert.match(css, /#landing-hero-caption\s*\{[^}]*pointer-events:\s*auto;[^}]*background:\s*transparent;[^}]*font-size:\s*17px;[^}]*cursor:\s*pointer;/s);
    assert.match(app, /data-landing-slide-photo-id="\$\{escapeHtml\(photoId\)\}"/);
    assert.match(app, /data-landing-slide-location="\$\{escapeHtml\(getLandingHeroLocationLabel\(photo\)\)\}"/);
    assert.match(app, /normalizeLandingHeroLocationLabel\(/);
    assert.match(app, /caption\.dataset\.landingCaptionPhotoId = activeSlide\.dataset\.landingSlidePhotoId \|\| ''/);
    assert.match(app, /event\.target\.closest\('\[data-landing-caption-photo-id\]'\)/);
    assert.doesNotMatch(html, /landing-hero-dots|data-landing-slide="/);
    assert.doesNotMatch(app, /\$\$\('\[data-landing-slide\]'\)/);
});

test('landing location captions keep only country and major region', () => {
    assert.equal(normalizeLandingHeroLocationLabel('일본 · 도쿄 · 분쿄'), '일본 · 도쿄');
    assert.equal(normalizeLandingHeroLocationLabel('대한민국 서울특별시 종로구'), '대한민국 · 서울');
    assert.equal(normalizeLandingHeroLocationLabel('대만, 가오슝, 치진'), '대만 · 가오슝');
    assert.equal(normalizeLandingHeroLocationLabel('인도 · 라자스탄 · 자이푸르'), '인도 · 라자스탄');
    assert.equal(normalizeLandingHeroLocationLabel('일본 · 홋카이도 · 삿포로'), '일본 · 홋카이도');
    assert.equal(normalizeLandingHeroLocationLabel('프랑스'), '프랑스');
    assert.equal(normalizeLandingHeroLocationLabel(''), '');
    assert.match(simplifiedLocationMigration, /일본 · 도쿄/);
    assert.match(simplifiedLocationMigration, /대만 · 가오슝/);
    const labelStart = app.indexOf('function getLandingHeroLocationLabel');
    const labelEnd = app.indexOf('\nfunction ', labelStart + 1);
    const labelFunction = app.slice(labelStart, labelEnd);
    assert.match(labelFunction, /state\.landingHeroLocationLabels\[photoId\][\s\S]*\|\| photo\.placeName/);
    assert.doesNotMatch(labelFunction, /photo\.(?:title|description|album)/);
});

test('landing brand keeps an Ikkyee wordmark with a Korean 이끼 label', () => {
    assert.match(html, /class="brand-wordmark">Ikkyee<\/span>[\s\S]*?class="brand-korean"[^>]*>이끼<\/span>/);
    assert.match(css, /\.brand-wordmark\s*\{[^}]*Cormorant Garamond/s);
});
