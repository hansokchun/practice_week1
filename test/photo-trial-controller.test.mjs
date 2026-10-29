import test from 'node:test';
import assert from 'node:assert/strict';

import { createPhotoTrialController } from '../js/photo-trial-controller.mjs';

class FakeElement {
    constructor() {
        this.listeners = new Map();
        this.dataset = {};
        this.hidden = false;
        this.files = [];
        this.textContent = '';
        this.value = '';
        this.attributes = new Map();
        const classes = new Set();
        this.classList = {
            toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
            remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); }
        };
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    removeEventListener(type) { this.listeners.delete(type); }
    emit(type, target = this) { this.listeners.get(type)?.({ target }); }
    click() { this.clicked = true; }
    closest(selector) {
        const key = selector.match(/data-([\w-]+)/)?.[1]?.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        return key && Object.hasOwn(this.dataset, key) ? this : null;
    }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
}

function createRoot() {
    const selectors = [
        'file-input', 'add', 'count', 'empty', 'workspace', 'list', 'image', 'name', 'date',
        'location', 'size', 'map', 'map-message', 'map-start', 'location-save',
        'location-clear', 'continue', 'error', 'clear', 'guide'
    ];
    const elements = new Map(selectors.map((name) => {
        const element = new FakeElement();
        const key = `trial-${name}`.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        element.dataset[key] = '';
        return [`[data-trial-${name}]`, element];
    }));
    const root = new FakeElement();
    root.querySelector = (selector) => elements.get(selector) || null;
    root.ownerDocument = {
        createElement() {
            const element = new FakeElement();
            element.append = (...children) => { element.children = children; };
            return element;
        }
    };
    return { root, elements };
}

function namedPhoto(name) {
    const file = new Blob(['photo'], { type: 'image/jpeg' });
    Object.defineProperties(file, { name: { value: name }, lastModified: { value: 1 } });
    return file;
}

async function settle() {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
}

test('the active trial picker accepts dropped files through the bounded persisted photo queue', async () => {
    const { root, elements } = createRoot();
    const saved = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async photos => saved.push(photos), clear: async () => {} },
        readExif: async () => ({}),
        createObjectUrl: file => `blob:${file.name}`,
        revokeObjectUrl: () => {}
    });
    controller.bind();
    await controller.open();
    const add = elements.get('[data-trial-add]');
    const dataTransfer = { types: ['Files'], files: ['1', '2', '3', '4'].map(name => namedPhoto(`${name}.jpg`)) };
    let prevented = 0;
    const event = { target: add, dataTransfer, preventDefault() { prevented++; } };

    root.listeners.get('dragover')?.(event);
    assert.equal(add.classList.contains('is-dragging'), true);
    root.listeners.get('drop')?.(event);
    await settle();

    assert.equal(prevented, 2);
    assert.equal(add.classList.contains('is-dragging'), false);
    assert.equal(controller.getPhotos().length, 3);
    assert.equal(saved.at(-1).length, 3);
    assert.equal(add.disabled, true);
    root.listeners.get('drop')?.(event);
    await settle();
    assert.equal(prevented, 3, 'a full picker must still prevent browser file navigation');
    assert.equal(controller.getPhotos().length, 3);
});

test('trial drag feedback ignores text, clears on leave/close, and detaches on disposal', async () => {
    const { root, elements } = createRoot();
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} }
    });
    controller.bind();
    await controller.open();
    const add = elements.get('[data-trial-add]');
    let prevented = 0;
    const text = { target: add, dataTransfer: { types: ['text/plain'], files: [] }, preventDefault() { prevented++; } };
    root.listeners.get('dragover')?.(text);
    root.listeners.get('drop')?.(text);
    assert.equal(prevented, 0);
    assert.equal(add.classList.contains('is-dragging'), false);

    const files = { target: add, dataTransfer: { types: ['Files'], files: [namedPhoto('a.jpg')] }, preventDefault() { prevented++; } };
    root.listeners.get('dragenter')?.(files);
    assert.equal(add.classList.contains('is-dragging'), true);
    root.listeners.get('dragleave')?.(files);
    assert.equal(add.classList.contains('is-dragging'), false);
    root.listeners.get('dragover')?.(files);
    root.emit('photo-trial:close');
    assert.equal(add.classList.contains('is-dragging'), false);
    const beforeClosedDrop = prevented;
    root.listeners.get('drop')?.(files);
    await settle();
    assert.equal(prevented, beforeClosedDrop);
    assert.equal(controller.getPhotos().length, 0);

    controller.dispose();
    for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) assert.equal(root.listeners.has(type), false, type);
});

test('controller appends at most three photos and survives EXIF failures', async () => {
    // Given
    const { root, elements } = createRoot();
    const saved = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async (items) => saved.push(items), clear: async () => {} },
        readExif: async () => { throw new Error('bad exif'); },
        createObjectUrl: (file) => `blob:${file.name}`,
        revokeObjectUrl: () => {},
        notify: () => {}
    });
    controller.bind();
    elements.get('[data-trial-file-input]').files = ['1', '2', '3', '4'].map((name) => namedPhoto(`${name}.jpg`));

    // When
    root.emit('change', elements.get('[data-trial-file-input]'));
    await settle();

    // Then
    assert.equal(controller.getPhotos().length, 3);
    assert.equal(controller.getPhotos()[0].date, null);
    assert.equal(elements.get('[data-trial-date]').textContent, '촬영일 정보 없음');
    assert.equal(saved.at(-1).length, 3);
    assert.equal(elements.get('[data-trial-add]').disabled, true);
    assert.equal(elements.get('[data-trial-continue]').disabled, false);
    const firstRemove = elements.get('[data-trial-list]').children[0].children[1];
    assert.equal(firstRemove.attributes.get('aria-label'), '1.jpg 삭제');
});

test('upload review can add guest files through the same persisted three-photo controller', async () => {
    const { root } = createRoot();
    let persisted = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async photos => { persisted = photos; }, clear: async () => {} },
        readExif: async () => ({ lat: 37.5, lng: 127.1 }),
        createObjectUrl: file => `blob:${file.name}`,
        revokeObjectUrl: () => {}
    });
    await controller.open();
    const photos = await controller.addPhotos(['a', 'b', 'c', 'd'].map(name => namedPhoto(`${name}.jpg`)));
    assert.equal(photos.length, 3);
    assert.equal(persisted.length, 3);
    assert.equal(photos[0].geo_source, 'exif');
});

test('the original intro cards appear only while the trial has no photos', async () => {
    const { root, elements } = createRoot();
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {} },
        readExif: async () => ({}),
        createObjectUrl: () => 'blob:intro-photo',
        revokeObjectUrl: () => {}
    });
    await controller.open();
    assert.equal(elements.get('[data-trial-empty]').hidden, false);
    assert.equal(elements.get('[data-trial-workspace]').hidden, true);
    const [photo] = await controller.addPhotos([namedPhoto('intro.jpg')]);
    assert.equal(elements.get('[data-trial-empty]').hidden, true);
    assert.equal(elements.get('[data-trial-workspace]').hidden, false);
    await controller.removeSaved([photo.id]);
    assert.equal(elements.get('[data-trial-empty]').hidden, false);
    assert.equal(elements.get('[data-trial-workspace]').hidden, true);
});

test('controller disables Continue until EXIF finishes and ignores repeated Continue clicks', async () => {
    // Given
    const { root, elements } = createRoot();
    let resolveExif;
    let continueCount = 0;
    let finishContinue;
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        readExif: () => new Promise((resolve) => { resolveExif = resolve; }),
        createObjectUrl: () => 'blob:one',
        revokeObjectUrl: () => {},
        onContinue: () => {
            continueCount += 1;
            return new Promise((resolve) => { finishContinue = resolve; });
        },
        notify: () => {}
    });
    controller.bind();
    const input = elements.get('[data-trial-file-input]');
    input.files = [namedPhoto('capture.jpg')];
    root.emit('change', input);
    await settle();

    // When / Then: metadata is still pending
    assert.equal(elements.get('[data-trial-continue]').disabled, true);
    root.emit('click', elements.get('[data-trial-continue]'));
    assert.equal(continueCount, 0);

    // When: EXIF completes and Continue is clicked twice
    resolveExif({ date: '2024-04-03T02:01:00.000Z', lat: 37.5, lng: 127.1 });
    await settle();
    assert.equal(elements.get('[data-trial-continue]').disabled, false);
    root.emit('click', elements.get('[data-trial-continue]'));
    root.emit('click', elements.get('[data-trial-continue]'));
    await settle();
    await settle();

    // Then
    assert.equal(continueCount, 1);
    finishContinue();
    await settle();
});

test('controller reports an unavailable Maps namespace with friendly copy', async () => {
    // Given
    const { root, elements } = createRoot();
    const notices = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        loadMaps: async () => null,
        notify: (message) => notices.push(message)
    });
    controller.bind();
    await controller.open();

    // When
    root.emit('click', elements.get('[data-trial-map-start]'));
    await settle();

    // Then
    assert.equal(notices.at(-1), '지도를 불러오지 못했습니다.');
});

test('controller cancels a late map load when the trial is cleared', async () => {
    // Given
    const { root, elements } = createRoot();
    let resolveMaps;
    let mapCount = 0;
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        readExif: async () => ({}),
        loadMaps: () => new Promise((resolve) => { resolveMaps = resolve; }),
        createObjectUrl: () => 'blob:map',
        revokeObjectUrl: () => {},
        notify: () => {}
    });
    controller.bind();
    await controller.open();
    const input = elements.get('[data-trial-file-input]');
    input.files = [namedPhoto('map.jpg')];
    root.emit('change', input);
    await settle();
    root.emit('click', elements.get('[data-trial-map-start]'));

    // When
    await controller.clear();
    resolveMaps({
        Map: class { constructor() { mapCount += 1; } },
        Marker: class {}
    });
    await settle();

    // Then
    assert.equal(mapCount, 0);
});

test('controller hides the map start action after the map is ready', async () => {
    // Given
    const { root, elements } = createRoot();
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        readExif: async () => ({}),
        loadMaps: async () => ({
            Map: class {
                addListener() {}
                panTo() {}
            },
            Marker: class {}
        }),
        createObjectUrl: () => 'blob:map-ready',
        revokeObjectUrl: () => {},
        notify: () => {}
    });
    controller.bind();
    await controller.open();
    const input = elements.get('[data-trial-file-input]');
    input.files = [namedPhoto('map-ready.jpg')];
    root.emit('change', input);
    await settle();

    // When
    root.emit('click', elements.get('[data-trial-map-start]'));
    await settle();

    // Then
    assert.equal(elements.get('[data-trial-map-start]').hidden, true);
    assert.equal(elements.get('[data-trial-map-start]').disabled, true);
    assert.match(elements.get('[data-trial-map-message]').textContent, /지도가 준비되었습니다/);
});

test('controller blocks Continue until pending map coordinates are explicitly applied', async () => {
    // Given
    const { root, elements } = createRoot();
    let mapClick;
    let continued = false;
    const notices = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        readExif: async () => ({}),
        loadMaps: async () => ({
            Map: class {
                addListener(type, listener) { if (type === 'click') mapClick = listener; }
                panTo() {}
            },
            Marker: class {
                addListener() {}
                setMap() {}
            }
        }),
        createObjectUrl: () => 'blob:pending-map',
        revokeObjectUrl: () => {},
        onContinue: async () => { continued = true; },
        notify: (message) => notices.push(message)
    });
    controller.bind();
    await controller.open();
    const input = elements.get('[data-trial-file-input]');
    input.files = [namedPhoto('pending-map.jpg')];
    root.emit('change', input);
    await settle();
    root.emit('click', elements.get('[data-trial-map-start]'));
    await settle();
    mapClick({ latLng: { lat: () => 37.5, lng: () => 127.1 } });

    // When
    root.emit('click', elements.get('[data-trial-continue]'));
    await settle();

    // Then
    assert.equal(continued, false);
    assert.equal(notices.at(-1), '선택한 위치를 먼저 적용해 주세요.');
    assert.match(elements.get('[data-trial-map-message]').textContent, /이 위치로 지정/);
});

test('controller ignores a late EXIF response after its photo is removed and revokes the URL', async () => {
    // Given
    const { root, elements } = createRoot();
    let resolveExif;
    const revoked = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        readExif: () => new Promise((resolve) => { resolveExif = resolve; }),
        createObjectUrl: () => 'blob:late',
        revokeObjectUrl: (url) => revoked.push(url),
        notify: () => {}
    });
    controller.bind();
    elements.get('[data-trial-file-input]').files = [namedPhoto('late.jpg')];
    root.emit('change', elements.get('[data-trial-file-input]'));
    await settle();
    const remove = new FakeElement();
    remove.dataset.trialRemove = controller.getPhotos()[0].id;

    // When
    root.emit('click', remove);
    resolveExif({ date: '2025-01-01T00:00:00.000Z', lat: 37, lng: 127 });
    await settle();

    // Then
    assert.deepEqual(controller.getPhotos(), []);
    assert.deepEqual(revoked, ['blob:late']);
});

test('controller blocks Continue when the draft cannot persist for OAuth reload', async () => {
    // Given
    const { root, elements } = createRoot();
    let continued = false;
    const notices = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => { throw new Error('storage unavailable'); }, clear: async () => {} },
        readExif: async () => ({}),
        createObjectUrl: () => 'blob:photo',
        revokeObjectUrl: () => {},
        onContinue: async () => { continued = true; },
        notify: (message) => notices.push(message)
    });
    controller.bind();
    elements.get('[data-trial-file-input]').files = [namedPhoto('one.jpg')];
    root.emit('change', elements.get('[data-trial-file-input]'));
    await settle();

    // When
    root.emit('click', elements.get('[data-trial-continue]'));
    await settle();

    // Then
    assert.equal(continued, false);
    assert.match(notices.at(-1), /로그인 후.*이어갈 수 없습니다/);
});

test('controller removeSaved removes only uploaded trial ids and persists the remainder', async () => {
    // Given
    const { root, elements } = createRoot();
    const saved = [];
    const revoked = [];
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async (items) => saved.push(items), clear: async () => {} },
        readExif: async () => ({}),
        createObjectUrl: (file) => `blob:${file.name}`,
        revokeObjectUrl: (url) => revoked.push(url),
        notify: () => {}
    });
    controller.bind();
    elements.get('[data-trial-file-input]').files = [namedPhoto('one.jpg'), namedPhoto('two.jpg')];
    root.emit('change', elements.get('[data-trial-file-input]'));
    await settle();
    const [uploaded, remaining] = controller.getPhotos();

    // When
    await controller.removeSaved([uploaded.id]);

    // Then
    assert.deepEqual(controller.getPhotos().map((photo) => photo.id), [remaining.id]);
    assert.deepEqual(revoked, ['blob:one.jpg']);
    assert.deepEqual(saved.at(-1).map((photo) => photo.id), [remaining.id]);
});

test('disposing an account trial removes its map tiles and listeners before another account opens', async () => {
    const { root, elements } = createRoot();
    const mapElement = elements.get('[data-trial-map]');
    let cleanedMap = null;
    const controller = createPhotoTrialController({
        root,
        store: { load: async () => [], save: async () => {}, clear: async () => {} },
        loadMaps: async () => ({
            Map: class {
                constructor(element) { element.replaceChildren('previous account map tiles'); }
                addListener() {}
            },
            Marker: class {},
            event: { clearInstanceListeners(map) { cleanedMap = map; } }
        })
    });
    controller.bind();
    await controller.open();
    root.emit('click', elements.get('[data-trial-map-start]'));
    await settle();
    assert.deepEqual(mapElement.children, ['previous account map tiles']);

    controller.dispose();

    assert.deepEqual(mapElement.children, []);
    assert.ok(cleanedMap);
    assert.equal(root.listeners.has('click'), false);
});
