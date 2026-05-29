export async function onRequestGet({ env }) {
    return Response.json({
        googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY || ''
    }, {
        headers: {
            'Cache-Control': 'no-store'
        }
    });
}
