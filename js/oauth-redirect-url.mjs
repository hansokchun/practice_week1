const FALLBACK_DEPLOYED_ORIGIN = 'https://practice-week1-cws.pages.dev';

export function getOAuthRedirectUrl(locationLike = globalThis.location) {
    const origin = locationLike?.origin || FALLBACK_DEPLOYED_ORIGIN;
    const hostname = locationLike?.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const safeOrigin = isLocalhost ? FALLBACK_DEPLOYED_ORIGIN : origin;
    return `${safeOrigin}/`;
}
