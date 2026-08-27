export function getStreetViewStaticImageUrl({ lat, lng, apiKey } = {}) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const key = String(apiKey || '').trim();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !key) return '';

    const params = new URLSearchParams({
        location: `${latitude},${longitude}`,
        size: '640x360',
        scale: '2',
        radius: '80',
        source: 'outdoor',
        fov: '90',
        heading: '0',
        pitch: '0',
        return_error_code: 'true',
        key
    });
    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
