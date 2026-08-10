function createMarkerImage(icon, createElement) {
    if (!icon?.url || typeof createElement !== 'function') return null;

    const image = createElement('img');
    image.src = icon.url;
    image.alt = '';
    image.className = 'google-map-marker-image';
    if (icon.scaledSize?.width) image.style.width = `${icon.scaledSize.width}px`;
    if (icon.scaledSize?.height) image.style.height = `${icon.scaledSize.height}px`;
    return image;
}

function getCompatiblePosition(position) {
    if (typeof position?.lat === 'function' && typeof position?.lng === 'function') return position;
    return {
        lat: () => Number(position?.lat),
        lng: () => Number(position?.lng)
    };
}

function wrapAdvancedMarker(marker) {
    const nativeAddListener = typeof marker.addListener === 'function'
        ? marker.addListener.bind(marker)
        : null;

    return {
        raw: marker,
        addListener(eventName, handler) {
            if (eventName === 'click' && typeof marker.addEventListener === 'function') {
                marker.gmpClickable = true;
                marker.addEventListener('gmp-click', handler);
                return {
                    remove() {
                        marker.removeEventListener?.('gmp-click', handler);
                    }
                };
            }
            return nativeAddListener?.(eventName, handler) || { remove() {} };
        },
        getPosition() {
            return getCompatiblePosition(marker.position);
        },
        setDraggable(isDraggable) {
            marker.gmpDraggable = Boolean(isDraggable);
        },
        setMap(map) {
            marker.map = map;
        },
        setPosition(position) {
            marker.position = position;
        }
    };
}

export function createGoogleMapsMarker(maps, options = {}, config = {}) {
    const mapId = typeof config.mapId === 'string' ? config.mapId.trim() : '';
    const AdvancedMarkerElement = maps?.marker?.AdvancedMarkerElement;
    if (!mapId || typeof AdvancedMarkerElement !== 'function') {
        return new maps.Marker(options);
    }

    const {
        draggable,
        icon,
        label,
        ...advancedOptions
    } = options;
    const createElement = config.createElement
        || globalThis.document?.createElement?.bind(globalThis.document);
    const content = createMarkerImage(icon, createElement);
    const marker = new AdvancedMarkerElement({
        ...advancedOptions,
        ...(content ? { content } : {}),
        gmpDraggable: Boolean(draggable)
    });
    return wrapAdvancedMarker(marker);
}
