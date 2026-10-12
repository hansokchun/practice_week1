export async function onRequestGet({ env }) {
    const analyticsId = typeof env.GOOGLE_ANALYTICS_MEASUREMENT_ID === 'string' ? env.GOOGLE_ANALYTICS_MEASUREMENT_ID.trim() : '';
    return Response.json({
        googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY || '',
        googleMapsMapId: env.VITE_GOOGLE_MAPS_MAP_ID || env.GOOGLE_MAPS_MAP_ID || '',
        googleAnalyticsMeasurementId: /^G-[A-Z0-9]{4,20}$/.test(analyticsId) ? analyticsId : ''
    }, {
        headers: {
            'Cache-Control': 'no-store'
        }
    });
}
