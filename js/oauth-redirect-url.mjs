const PRODUCTION_ORIGIN = 'https://practice-week1-cws.pages.dev';

export function getOAuthRedirectUrl(locationLike = globalThis.location) {
    const origin = locationLike?.origin || PRODUCTION_ORIGIN;
    const hostname = locationLike?.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const safeOrigin = isLocalhost ? PRODUCTION_ORIGIN : origin;
    return `${safeOrigin}/`;
}
