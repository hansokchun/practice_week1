import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const markup = () => readFileSync('index.html', 'utf8');
const packageJson = () => JSON.parse(readFileSync('package.json', 'utf8'));
const appSource = () => readFileSync('js/app.js', 'utf8');

test('home feature imagery uses the compact JPEG assets directly', () => {
    const source = markup();
    const assets = [
        'landing-globe-sprout-route',
        'home-section-divider',
        'home-map-memory-board',
        'home-travel-replay',
        'home-explore-guide'
    ];

    for (const asset of assets) {
        assert.match(source, new RegExp(`src="images/${asset}\\.jpg"`));
        assert.doesNotMatch(source, new RegExp(`images/${asset}\\.png`));
    }
});

test('below-the-fold home imagery remains lazy and asynchronously decoded', () => {
    const source = markup();
    const images = source.match(/<img[^>]+src="images\/home-(?:section-divider|map-memory-board|travel-replay|explore-guide)\.jpg"[^>]*>/g) || [];

    assert.equal(images.length, 4);
    images.forEach((image) => {
        assert.match(image, /loading="lazy"/);
        assert.match(image, /decoding="async"/);
        assert.match(image, /width="\d+"/);
        assert.match(image, /height="\d+"/);
    });
});

test('the repository exposes an enforceable production performance budget', () => {
    const scripts = packageJson().scripts;
    const checker = readFileSync('scripts/check-performance-budget.mjs', 'utf8');

    assert.equal(scripts['perf:budget'], 'npm run build && node scripts/check-performance-budget.mjs');
    assert.match(checker, /javascriptGzipKb:\s*70/);
    assert.match(checker, /cssGzipKb:\s*34/);
    assert.match(checker, /totalImageKb:\s*2200/);
    assert.match(checker, /largestImageKb:\s*450/);
});

test('client-side route rendering records a local duration for browser QA', () => {
    const source = appSource();
    const routeStart = source.indexOf('function renderRoute(section)');
    const routeEnd = source.indexOf('function applyRouteHash(', routeStart);
    const routeBody = source.slice(routeStart, routeEnd);

    assert.match(routeBody, /window\.performance\.now\(\)/);
    assert.match(routeBody, /document\.body\.dataset\.routeRenderMs/);
});
