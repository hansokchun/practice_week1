import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGoogleMapsMarker } from '../js/google-maps-marker.mjs';

class LegacyMarker {
    constructor(options) {
        this.options = options;
    }
}

class AdvancedMarker {
    constructor(options) {
        Object.assign(this, options);
        this.domListeners = [];
        this.mapListeners = [];
    }

    addEventListener(name, handler) {
        this.domListeners.push({ name, handler });
    }

    removeEventListener(name, handler) {
        this.domListeners = this.domListeners.filter((listener) => (
            listener.name !== name || listener.handler !== handler
        ));
    }

    addListener(name, handler) {
        this.mapListeners.push({ name, handler });
        return { remove() {} };
    }
}

function createImage() {
    return { style: {}, className: '', alt: '', src: '' };
}

test('marker factory keeps the legacy marker until a Map ID is configured', () => {
    const marker = createGoogleMapsMarker({ Marker: LegacyMarker }, {
        map: 'map',
        position: { lat: 37.5, lng: 127 }
    });

    assert.ok(marker instanceof LegacyMarker);
    assert.equal(marker.options.map, 'map');
});

test('marker factory uses an advanced marker with a compatible app interface', () => {
    const clickHandler = () => {};
    const marker = createGoogleMapsMarker({
        Marker: LegacyMarker,
        marker: { AdvancedMarkerElement: AdvancedMarker }
    }, {
        map: 'map',
        position: { lat: 37.5, lng: 127 },
        title: '여행 사진',
        icon: {
            url: 'data:image/svg+xml,test',
            scaledSize: { width: 28, height: 36 }
        },
        draggable: true,
        zIndex: 20
    }, {
        mapId: 'ikkyee-map',
        createElement: createImage
    });

    assert.equal(marker.raw.map, 'map');
    assert.equal(marker.raw.gmpDraggable, true);
    assert.equal(marker.raw.content.src, 'data:image/svg+xml,test');
    assert.equal(marker.raw.content.style.width, '28px');
    assert.equal(marker.raw.content.style.height, '36px');

    marker.addListener('click', clickHandler);
    assert.equal(marker.raw.gmpClickable, true);
    assert.equal(marker.raw.domListeners[0].name, 'gmp-click');

    marker.setMap(null);
    marker.setPosition({ lat: 35, lng: 129 });
    marker.setDraggable(false);
    marker.setIcon({
        url: 'data:image/svg+xml,small',
        scaledSize: { width: 16, height: 21 }
    });
    assert.equal(marker.raw.map, null);
    assert.deepEqual(marker.raw.position, { lat: 35, lng: 129 });
    assert.equal(marker.raw.gmpDraggable, false);
    assert.equal(marker.raw.content.src, 'data:image/svg+xml,small');
    assert.equal(marker.raw.content.style.width, '16px');
    assert.equal(marker.raw.content.style.height, '21px');
    assert.equal(marker.getPosition().lat(), 35);
    assert.equal(marker.getPosition().lng(), 129);
});

test('advanced marker drag events continue through the Maps event API', () => {
    const marker = createGoogleMapsMarker({
        Marker: LegacyMarker,
        marker: { AdvancedMarkerElement: AdvancedMarker }
    }, { position: { lat: 37.5, lng: 127 } }, { mapId: 'ikkyee-map' });

    marker.addListener('dragend', () => {});
    assert.equal(marker.raw.mapListeners[0].name, 'dragend');
});
