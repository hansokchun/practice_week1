import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    LANDING_SLIDE_INTERVAL_MS,
    getNextLandingSlideIndex
} from '../js/landing-slideshow.mjs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const auth = readFileSync('auth.js', 'utf8');
const migration = readFileSync('supabase/migrations/20260904100942_add_landing_hero_curation.sql', 'utf8');
const optimizedRlsMigration = readFileSync('supabase/migrations/20260904101737_optimize_landing_hero_rls.sql', 'utf8');

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

test('landing slideshow advances every three seconds and wraps around', () => {
    assert.equal(LANDING_SLIDE_INTERVAL_MS, 3_000);
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
    assert.match(app, /saveLandingHeroSlides\(state\.landingHeroPhotoIds\.slice\(0, LANDING_HERO_SLIDE_LIMIT\)\)/);
    assert.match(auth, /from\('landing_hero_photos'\)/);
    assert.match(migration, /create table if not exists public\.landing_hero_photos/i);
    assert.match(migration, /alter table public\.landing_hero_photos enable row level security/i);
    assert.match(migration, /coalesce\(auth\.jwt\(\) -> 'app_metadata' ->> 'role', ''\) = 'admin'/i);
    assert.match(optimizedRlsMigration, /coalesce\(\(select auth\.jwt\(\)\) -> 'app_metadata' ->> 'role', ''\) = 'admin'/i);
});

test('landing footer shows only a centered location pin and place without photo order controls', () => {
    assert.match(html, /id="landing-hero-caption"[^>]*>[\s\S]*?location_on[\s\S]*?data-landing-caption-place/);
    assert.doesNotMatch(html, /data-landing-caption-position|data-landing-slide-position/);
    assert.match(css, /#landing-hero-caption\s*\{[^}]*font-size:\s*17px;/s);
    assert.doesNotMatch(html, /landing-hero-dots|data-landing-slide="/);
    assert.doesNotMatch(app, /\$\$\('\[data-landing-slide\]'\)/);
});

test('landing brand keeps an Ikkyee wordmark with a Korean 이끼 label', () => {
    assert.match(html, /class="brand-wordmark">Ikkyee<\/span>[\s\S]*?class="brand-korean"[^>]*>이끼<\/span>/);
    assert.match(css, /\.brand-wordmark\s*\{[^}]*Cormorant Garamond/s);
});
