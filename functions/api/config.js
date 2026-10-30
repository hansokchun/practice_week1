const EXCLUDED_ANALYTICS_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO',
    'SK', 'SI', 'ES', 'SE', 'CH', 'GB', 'XX', 'T1'
]);
// Public site identifier from Cloudflare Web Analytics, not an API credential.
const ANALYTICS_SITE_TOKEN = 'c3544ec773524f6987e6ce84dc4476c3';

export async function onRequestGet({ env, request }) {
    const country = request?.cf?.country;
    const production = request && ['ikkyee.com', 'www.ikkyee.com'].includes(new URL(request.url).hostname);
    const analyticsAllowed = production && /^[A-Z]{2}$/.test(country || '') && !EXCLUDED_ANALYTICS_COUNTRIES.has(country);
    return Response.json({
        googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY || '',
        googleMapsMapId: env.VITE_GOOGLE_MAPS_MAP_ID || env.GOOGLE_MAPS_MAP_ID || '',
        cloudflareAnalyticsToken: analyticsAllowed ? ANALYTICS_SITE_TOKEN : '',
        siteActivityEnabled: Boolean(analyticsAllowed && env.SITE_ANALYTICS_INGEST_KEY && env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY)
    }, {
        headers: {
            'Cache-Control': 'no-store'
        }
    });
}
