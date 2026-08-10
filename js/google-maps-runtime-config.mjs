function normalizePublicValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeGoogleMapsRuntimeConfig(config = {}) {
    return {
        apiKey: normalizePublicValue(config.googleMapsApiKey),
        mapId: normalizePublicValue(config.googleMapsMapId)
    };
}

export function withGoogleMapsMapId(options = {}, mapId = '') {
    const normalizedMapId = normalizePublicValue(mapId);
    if (!normalizedMapId) return options;

    const { styles, ...mapIdCompatibleOptions } = options;
    return { ...mapIdCompatibleOptions, mapId: normalizedMapId };
}
