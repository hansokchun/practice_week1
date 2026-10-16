export const LANDING_SEARCH_PAGE_SIZE = 24;

function getCoordinateValue(value, context) {
    if (typeof value === 'function') {
        try {
            return getCoordinateValue(value.call(context));
        } catch {
            return null;
        }
    }
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !value.trim()) return null;
    try {
        const coordinate = Number(value);
        return Number.isFinite(coordinate) ? coordinate : null;
    } catch {
        return null;
    }
}

function isValidLatitude(value) {
    return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
    return value !== null && value >= -180 && value <= 180;
}

function normalizeBoundsValues(values) {
    const north = getCoordinateValue(values?.north, values);
    const south = getCoordinateValue(values?.south, values);
    const east = getCoordinateValue(values?.east, values);
    const west = getCoordinateValue(values?.west, values);
    if (!isValidLatitude(north) || !isValidLatitude(south) || !isValidLongitude(east) || !isValidLongitude(west) || north < south) return null;
    return { north, south, east, west };
}

function normalizeBounds(bounds) {
    if (!bounds) return null;
    try {
        const fromJson = typeof bounds.toJSON === 'function' ? normalizeBoundsValues(bounds.toJSON()) : null;
        if (fromJson) return fromJson;

        const direct = normalizeBoundsValues(bounds);
        if (direct) return direct;

        const northEast = bounds.getNorthEast?.();
        const southWest = bounds.getSouthWest?.();
        if (!northEast || !southWest) return null;
        return normalizeBoundsValues({
            north: getCoordinateValue(northEast.lat, northEast),
            east: getCoordinateValue(northEast.lng, northEast),
            south: getCoordinateValue(southWest.lat, southWest),
            west: getCoordinateValue(southWest.lng, southWest)
        });
    } catch {
        return null;
    }
}

function createLocationSearchError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function getGeocodeError(status) {
    if (status === 'REQUEST_DENIED') return createLocationSearchError('GEOCODE_REQUEST_DENIED');
    if (status === 'OVER_QUERY_LIMIT') return createLocationSearchError('GEOCODE_OVER_QUERY_LIMIT');
    return createLocationSearchError('GEOCODE_FAILED');
}

export function normalizeLandingLocationQuery(value) {
    return String(value ?? '').trim().replace(/\s+/gu, ' ').slice(0, 100);
}

export function isPublicLandingSearchPhoto(photo) {
    if (!photo || typeof photo !== 'object') return false;
    if (photo.visibility === 'public') return true;
    return !Object.hasOwn(photo, 'visibility') && photo.shared === true;
}

export function getLandingLocationBounds(result) {
    const geometry = result?.geometry;
    return normalizeBounds(geometry?.bounds) || normalizeBounds(geometry?.viewport);
}

export function getLandingLocationPhotos(photos, bounds) {
    const normalizedBounds = normalizeBounds(bounds);
    if (!normalizedBounds || !Array.isArray(photos)) return [];

    return photos.filter((photo) => {
        if (!isPublicLandingSearchPhoto(photo)) return false;
        const latitude = getCoordinateValue(photo.lat);
        const longitude = getCoordinateValue(photo.lng);
        if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return false;
        const insideLatitude = latitude >= normalizedBounds.south && latitude <= normalizedBounds.north;
        const insideLongitude = normalizedBounds.west <= normalizedBounds.east
            ? longitude >= normalizedBounds.west && longitude <= normalizedBounds.east
            : longitude >= normalizedBounds.west || longitude <= normalizedBounds.east;
        return insideLatitude && insideLongitude;
    });
}

export function getLandingSearchPage(photos, requestedPage = 1) {
    const items = Array.isArray(photos) ? photos : [];
    const pageCount = Math.max(1, Math.ceil(items.length / LANDING_SEARCH_PAGE_SIZE));
    const requested = Math.floor(Number(requestedPage) || 1);
    const page = Math.min(pageCount, Math.max(1, requested));
    const start = (page - 1) * LANDING_SEARCH_PAGE_SIZE;
    return {
        items: items.slice(start, start + LANDING_SEARCH_PAGE_SIZE),
        page,
        pageCount,
        total: items.length,
        hasPrevious: page > 1,
        hasNext: page < pageCount
    };
}

export function resolveLandingLocation(query, { loadMaps, timeoutMs = 10000 } = {}) {
    const address = normalizeLandingLocationQuery(query);
    if (!address) return Promise.resolve(null);
    if (typeof loadMaps !== 'function') return Promise.reject(createLocationSearchError('MAPS_LOAD_FAILED'));

    const timeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : 10000;
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback(value);
        };
        const timer = setTimeout(() => finish(reject, createLocationSearchError('LOCATION_SEARCH_TIMEOUT')), timeout);

        Promise.resolve()
            .then(() => loadMaps())
            .then((maps) => {
                if (settled) return;
                if (!maps || typeof maps.Geocoder !== 'function') {
                    finish(reject, createLocationSearchError('MAPS_LOAD_FAILED'));
                    return;
                }

                try {
                    const geocoder = new maps.Geocoder();
                    geocoder.geocode({ address }, (results, status) => {
                        if (settled) return;
                        if (status === 'ZERO_RESULTS') {
                            finish(resolve, null);
                            return;
                        }
                        if (status !== 'OK') {
                            finish(reject, getGeocodeError(status));
                            return;
                        }
                        if (!results?.[0]) {
                            finish(resolve, null);
                            return;
                        }

                        const bounds = getLandingLocationBounds(results[0]);
                        if (!bounds) {
                            finish(reject, createLocationSearchError('GEOCODE_INVALID_GEOMETRY'));
                            return;
                        }
                        const label = normalizeLandingLocationQuery(results[0].formatted_address) || address;
                        finish(resolve, { label, bounds });
                    });
                } catch {
                    finish(reject, createLocationSearchError('GEOCODE_FAILED'));
                }
            }, () => finish(reject, createLocationSearchError('MAPS_LOAD_FAILED')));
    });
}
