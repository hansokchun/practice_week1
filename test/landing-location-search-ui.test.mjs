import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import {
    getLandingLocationPhotos,
    getLandingSearchPage,
    isPublicLandingSearchPhoto,
    normalizeLandingLocationQuery
} from '../js/landing-location-search.mjs';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function getAppFunctionSource(name) {
    const start = appSource.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
    assert.notEqual(start, -1, `js/app.js must declare ${name}()`);
    const end = appSource.indexOf('\n}', start);
    assert.notEqual(end, -1, `js/app.js must close ${name}()`);
    return appSource.slice(start, end + 2);
}

function loadAppFunctions(names, bindings = {}) {
    const source = names.map(getAppFunctionSource).join('\n\n');
    const context = { console, ...bindings };
    const exposed = runInNewContext(`${source}\n; ({ ${names.join(', ')} })`, context);
    return { ...exposed, context };
}

function createLandingState(overrides = {}) {
    return {
        savedPhotos: [],
        landingSearchQuery: '',
        landingSearch: {
            status: 'idle',
            location: null,
            page: 1,
            requestId: 0
        },
        ...overrides
    };
}

function createElement(initial = {}) {
    const attributes = new Map();
    return {
        ...initial,
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        getAttribute(name) {
            return attributes.get(name) ?? null;
        },
        removeAttribute(name) {
            attributes.delete(name);
        },
        scrollIntoView() {
            this.didScrollIntoView = true;
        }
    };
}

function createDom(inputValue = '') {
    const input = createElement({ value: inputValue });
    const form = createElement();
    const submit = createElement({ disabled: false });
    const sections = createElement({ innerHTML: '' });
    const elements = new Map([
        ['#landing-search-input', input],
        ['#landing-search', form],
        ['#landing-search-submit', submit],
        ['#landing-sections', sections]
    ]);
    return {
        input,
        form,
        submit,
        sections,
        $(selector) {
            return elements.get(selector) || null;
        }
    };
}

function localSearch(photos, query) {
    const needle = String(query).toLowerCase();
    return photos.filter((photo) => String(photo.title || photo.placeName || '').toLowerCase().includes(needle));
}

function publicPhoto(id, overrides = {}) {
    return {
        id,
        visibility: 'public',
        title: String(id),
        thumbnail_path: 'thumb.jpg',
        ...overrides
    };
}

test('known landing concepts stay local while place and country queries remain geocodable', async () => {
    const { isLandingConceptSearch } = await import('../js/landing-sections.mjs');

    assert.equal(typeof isLandingConceptSearch, 'function');
    assert.equal(isLandingConceptSearch('바다'), true);
    assert.equal(isLandingConceptSearch('도로'), true);
    assert.equal(isLandingConceptSearch('사람'), true);
    assert.equal(isLandingConceptSearch('ROAD'), true);
    assert.equal(isLandingConceptSearch('바다 숲'), true);
    assert.equal(isLandingConceptSearch('서울'), false);
    assert.equal(isLandingConceptSearch('대한민국'), false);
    assert.equal(isLandingConceptSearch('제주 바다'), false);
});

test('landing location search has no per-keystroke lookup binding', () => {
    assert.doesNotMatch(
        appSource,
        /\$\('#landing-search-input'\)\?\.addEventListener\('input'/,
        'geocoding must begin only after the search form is submitted'
    );
});

test('active search renders despite curation loading or failure, while non-search retains loading and failure gates', () => {
    const dom = createDom();
    const state = createLandingState({
        savedPhotos: [publicPhoto('seoul', { title: '서울 골목', lat: 37.5, lng: 127 })],
        landingSearchQuery: '서울',
        landingSearch: { status: 'text', location: null, page: 1, requestId: 1 },
        hasLoadedSavedPhotos: true,
        hasLoadedLandingCuration: false,
        savedPhotosLoadError: false,
        savedPhotosLoadFailure: null,
        landingCurationLoadError: null,
        landingSections: []
    });
    const { renderLandingSections } = loadAppFunctions(
        ['syncLandingSearchControls', 'getActiveLandingSearchPhotos', 'renderLandingSearchResults', 'renderLandingSections'],
        {
            state,
            $: dom.$,
            navigator: { onLine: true },
            isPublicLandingSearchPhoto,
            getLandingLocationPhotos,
            getLandingSearchResults: localSearch,
            getLandingSearchPage,
            renderLandingPhotoCard: (photo) => `<article data-photo="${photo.id}"></article>`,
            escapeHtml: (value) => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
            renderActionableFailure: () => '<article class="actionable-failure-state"></article>',
            getLibraryFailureState: () => ({ title: 'failed', body: 'failed', action: 'retry' }),
            lastLandingSectionsMarkup: null
        }
    );

    renderLandingSections();
    assert.match(dom.sections.innerHTML, /landing-search-results/);
    assert.doesNotMatch(dom.sections.innerHTML, /landing-loading-state|actionable-failure-state/);

    state.landingCurationLoadError = new Error('curation failed');
    renderLandingSections();
    assert.match(dom.sections.innerHTML, /landing-search-results/);
    assert.doesNotMatch(dom.sections.innerHTML, /actionable-failure-state/);

    state.landingSearchQuery = '';
    state.landingSearch.status = 'idle';
    renderLandingSections();
    assert.match(dom.sections.innerHTML, /actionable-failure-state/);

    state.landingCurationLoadError = null;
    renderLandingSections();
    assert.match(dom.sections.innerHTML, /landing-loading-state/);

    state.landingSearchQuery = '서울';
    state.landingSearch.status = 'text';
    state.savedPhotosLoadError = true;
    renderLandingSections();
    assert.match(dom.sections.innerHTML, /actionable-failure-state/);
});

test('submit resolves a location once, ignores a duplicate pending submit, and rejects stale results', async () => {
    const dom = createDom('서울');
    const state = createLandingState();
    const pending = [];
    let renderCalls = 0;
    const resolver = (query, options) => new Promise((resolve, reject) => {
        pending.push({ query, options, resolve, reject });
    });
    const mapsLoader = () => Promise.resolve({});
    const { submitLandingSearch } = loadAppFunctions(
        ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch'],
        {
            state,
            $: dom.$,
            normalizeLandingLocationQuery,
            renderLandingSections: () => { renderCalls += 1; },
            resolveLandingLocation: resolver,
            loadGoogleMapsApi: mapsLoader,
            getLandingSearchResults: localSearch,
            isLandingConceptSearch: () => false
        }
    );
    const event = { preventDefault() { this.prevented = true; } };

    const first = submitLandingSearch(event);
    assert.equal(event.prevented, true);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].query, '서울');
    assert.equal(pending[0].options.loadMaps, mapsLoader);
    assert.equal(state.landingSearch.status, 'loading');

    const duplicate = submitLandingSearch({ preventDefault() {} });
    assert.equal(pending.length, 1, 'the same pending query must share its request');

    dom.input.value = '부산';
    const second = submitLandingSearch({ preventDefault() {} });
    assert.equal(pending.length, 2);
    assert.equal(pending[1].query, '부산');

    pending[0].resolve({ label: 'Seoul, <b>Republic of Korea</b>', bounds: { north: 38, south: 37, east: 128, west: 126 } });
    await first;
    await duplicate;
    assert.equal(state.landingSearchQuery, '부산');
    assert.equal(state.landingSearch.status, 'loading', 'a stale result must not replace the newer pending query');

    pending[1].resolve({ label: 'Busan, Republic of Korea', bounds: { north: 36, south: 35, east: 130, west: 128 } });
    await second;
    assert.equal(state.landingSearch.status, 'ready');
    assert.equal(state.landingSearch.location.label, 'Busan, Republic of Korea');
    assert.ok(renderCalls >= 3, 'state transitions must render the landing sections');
});

test('blank and local-topic submits reset to text results without a geocoder request', async () => {
    const dom = createDom('   ');
    const state = createLandingState({
        savedPhotos: [publicPhoto('sea', { title: '바다' })],
        landingSearchQuery: 'previous',
        landingSearch: { status: 'ready', location: { label: 'Old', bounds: {} }, page: 3, requestId: 4 }
    });
    let resolverCalls = 0;
    const { submitLandingSearch } = loadAppFunctions(
        ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch'],
        {
            state,
            $: dom.$,
            normalizeLandingLocationQuery,
            renderLandingSections() {},
            resolveLandingLocation: async () => { resolverCalls += 1; return null; },
            loadGoogleMapsApi: async () => ({}),
            getLandingSearchResults: localSearch,
            isLandingConceptSearch: (query) => query === '바다'
        }
    );

    await submitLandingSearch({ preventDefault() {} });
    assert.equal(state.landingSearchQuery, '');
    assert.deepEqual(state.landingSearch, { status: 'idle', location: null, page: 1, requestId: 5 });

    dom.input.value = '바다';
    await submitLandingSearch({ preventDefault() {} });
    assert.equal(resolverCalls, 0, 'a known on-page topic must stay a local text search');
    assert.equal(state.landingSearchQuery, '바다');
    assert.equal(state.landingSearch.status, 'text');
    assert.equal(state.landingSearch.location, null);
});

test('a resolver failure preserves the normalized text query and exposes an allowlisted diagnostic code', async () => {
    const dom = createDom('  제주도  ');
    const state = createLandingState();
    const warnings = [];
    const { submitLandingSearch } = loadAppFunctions(
        ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch'],
        {
            state,
            $: dom.$,
            normalizeLandingLocationQuery,
            renderLandingSections() {},
            resolveLandingLocation: async () => {
                const error = new Error('provider details: private-provider-detail');
                error.code = 'untrusted-provider-token';
                error.request = { query: '제주도', key: 'redacted-provider-key' };
                throw error;
            },
            loadGoogleMapsApi: async () => ({}),
            getLandingSearchResults: localSearch,
            isLandingConceptSearch: () => false,
            console: { warn(...args) { warnings.push(args); } }
        }
    );

    await submitLandingSearch({ preventDefault() {} });
    assert.equal(state.landingSearchQuery, '제주도');
    assert.equal(state.landingSearch.status, 'error');
    assert.equal(state.landingSearch.location, null);
    assert.equal(JSON.stringify(warnings), JSON.stringify([['Landing location search failed', { code: 'LOCATION_SEARCH_FAILED' }]]));
});

test('known resolver failures log only their stable diagnostic code', async () => {
    const diagnosticCodes = [
        'MAPS_LOAD_FAILED',
        'GEOCODE_REQUEST_DENIED',
        'GEOCODE_OVER_QUERY_LIMIT',
        'GEOCODE_FAILED',
        'GEOCODE_INVALID_GEOMETRY',
        'LOCATION_SEARCH_TIMEOUT'
    ];

    for (const code of diagnosticCodes) {
        const dom = createDom('서울');
        const state = createLandingState();
        const warnings = [];
        const { submitLandingSearch } = loadAppFunctions(
            ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch'],
            {
                state,
                $: dom.$,
                normalizeLandingLocationQuery,
                renderLandingSections() {},
                resolveLandingLocation: async () => {
                    const error = new Error(`provider detail: ${code}`);
                    error.code = code;
                    throw error;
                },
                loadGoogleMapsApi: async () => ({}),
                getLandingSearchResults: localSearch,
                isLandingConceptSearch: () => false,
                console: { warn(...args) { warnings.push(args); } }
            }
        );

        await submitLandingSearch({ preventDefault() {} });
        assert.equal(JSON.stringify(warnings), JSON.stringify([['Landing location search failed', { code }]]), code);
    }
});

test('zero geocode results preserve text search and use the not-found state', async () => {
    const dom = createDom('없는 장소');
    const state = createLandingState();
    const { submitLandingSearch } = loadAppFunctions(
        ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch'],
        {
            state,
            $: dom.$,
            normalizeLandingLocationQuery,
            renderLandingSections() {},
            resolveLandingLocation: async () => null,
            loadGoogleMapsApi: async () => ({}),
            getLandingSearchResults: localSearch,
            isLandingConceptSearch: () => false
        }
    );

    await submitLandingSearch({ preventDefault() {} });
    assert.equal(state.landingSearchQuery, '없는 장소');
    assert.equal(state.landingSearch.status, 'not-found');
    assert.equal(state.landingSearch.location, null);
});

test('a local suggestion invalidates a pending location response without resolving again', async () => {
    const dom = createDom('서울');
    const state = createLandingState();
    let resolvePending;
    let resolverCalls = 0;
    const { submitLandingSearch, setLandingSearchSuggestion } = loadAppFunctions(
        ['syncLandingSearchControls', 'syncLandingSearchQuery', 'submitLandingSearch', 'setLandingSearchSuggestion'],
        {
            state,
            $: dom.$,
            normalizeLandingLocationQuery,
            renderLandingSections() {},
            resolveLandingLocation: () => {
                resolverCalls += 1;
                return new Promise((resolve) => { resolvePending = resolve; });
            },
            loadGoogleMapsApi: async () => ({}),
            getLandingSearchResults: localSearch,
            isLandingConceptSearch: (query) => query === '바다'
        }
    );

    const submit = submitLandingSearch({ preventDefault() {} });
    assert.equal(resolverCalls, 1);
    setLandingSearchSuggestion('바다');
    assert.equal(dom.input.value, '바다');
    assert.equal(state.landingSearch.status, 'text');
    assert.equal(resolverCalls, 1);

    resolvePending({ label: 'Seoul', bounds: { north: 38, south: 37, east: 128, west: 126 } });
    await submit;
    assert.equal(state.landingSearchQuery, '바다');
    assert.equal(state.landingSearch.status, 'text');
    assert.equal(state.landingSearch.location, null);
});

test('active location search photos only use saved public non-demo photos and real coordinates', () => {
    const state = createLandingState({
        savedPhotos: [
            publicPhoto('inside', { lat: 37.5, lng: 127 }),
            publicPhoto('outside', { lat: 34, lng: 127 }),
            publicPhoto('demo', { lat: 37.5, lng: 127, owner_id: 'demo' }),
            publicPhoto('private', { visibility: 'private', lat: 37.5, lng: 127 }),
            publicPhoto('link', { visibility: 'link', lat: 37.5, lng: 127 }),
            publicPhoto('no-coordinates', { lat: null, lng: null })
        ],
        landingSearchQuery: 'ignored for coordinates',
        landingSearch: {
            status: 'ready',
            location: { label: 'Seoul', bounds: { north: 38, south: 37, east: 128, west: 126 } },
            page: 1,
            requestId: 1
        }
    });
    const { getActiveLandingSearchPhotos } = loadAppFunctions(
        ['getActiveLandingSearchPhotos'],
        { state, isPublicLandingSearchPhoto, getLandingLocationPhotos, getLandingSearchResults: localSearch }
    );

    assert.deepEqual(getActiveLandingSearchPhotos().map((photo) => photo.id), ['inside']);
});

test('changing a result page clamps through pagination and never starts a resolver request', () => {
    const state = createLandingState({
        savedPhotos: Array.from({ length: 49 }, (_, index) => publicPhoto(index + 1, { lat: 37.5, lng: 127 })),
        landingSearchQuery: '서울',
        landingSearch: {
            status: 'ready',
            location: { label: 'Seoul', bounds: { north: 38, south: 37, east: 128, west: 126 } },
            page: 1,
            requestId: 1
        }
    });
    let renderCalls = 0;
    const { changeLandingSearchPage } = loadAppFunctions(
        ['getActiveLandingSearchPhotos', 'changeLandingSearchPage'],
        {
            state,
            isPublicLandingSearchPhoto,
            getLandingLocationPhotos,
            getLandingSearchResults: localSearch,
            getLandingSearchPage,
            renderLandingSections: () => { renderCalls += 1; },
            resolveLandingLocation: () => { throw new Error('pagination must not resolve a location'); }
        }
    );

    changeLandingSearchPage('next');
    changeLandingSearchPage('next');
    changeLandingSearchPage('next');
    assert.equal(state.landingSearch.page, 3);
    assert.equal(renderCalls, 3);
});

test('search controls expose busy state and renderer caps cards while escaping location labels', () => {
    const dom = createDom();
    const state = createLandingState({
        savedPhotos: Array.from({ length: 25 }, (_, index) => publicPhoto(index + 1, { lat: 37.5, lng: 127 })),
        landingSearchQuery: '서울',
        landingSearch: {
            status: 'loading',
            location: null,
            page: 1,
            requestId: 1
        }
    });
    const escapeHtml = (value) => String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    const { syncLandingSearchControls, renderLandingSearchResults } = loadAppFunctions(
        ['syncLandingSearchControls', 'getActiveLandingSearchPhotos', 'renderLandingSearchResults'],
        {
            state,
            $: dom.$,
            isPublicLandingSearchPhoto,
            getLandingLocationPhotos,
            getLandingSearchResults: localSearch,
            getLandingSearchPage,
            renderLandingPhotoCard: (photo) => `<article data-photo="${photo.id}"></article>`,
            escapeHtml,
            lastLandingSectionsMarkup: null
        }
    );

    syncLandingSearchControls();
    assert.equal(dom.form.getAttribute('aria-busy'), 'true');
    assert.equal(dom.submit.disabled, true);

    renderLandingSearchResults(dom.sections);
    assert.match(dom.sections.innerHTML, /role="status"/);

    state.landingSearch.status = 'ready';
    state.landingSearch.location = { label: 'Seoul <img src=x>', bounds: { north: 90, south: -90, east: 180, west: -180 } };
    syncLandingSearchControls();
    renderLandingSearchResults(dom.sections);
    assert.equal(dom.form.getAttribute('aria-busy'), null);
    assert.equal(dom.submit.disabled, false);
    assert.equal((dom.sections.innerHTML.match(/data-photo=/g) || []).length, 24);
    assert.match(dom.sections.innerHTML, /Seoul &lt;img src=x&gt;/);
    assert.doesNotMatch(dom.sections.innerHTML, /Seoul <img src=x>/);

    state.savedPhotos = [];
    renderLandingSearchResults(dom.sections);
    assert.match(dom.sections.innerHTML, /role="status"|role="alert"/);
});
