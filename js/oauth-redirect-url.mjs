const PAGES_ROOT_HOSTNAME = 'practice-week1-cws.pages.dev';
const DEV_BRANCH_ORIGIN = `https://dev.${PAGES_ROOT_HOSTNAME}`;

export function getOAuthRedirectUrl(locationLike = globalThis.location) {
    const origin = locationLike?.origin || DEV_BRANCH_ORIGIN;
    const hostname = locationLike?.hostname || '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isCloudflarePreview = hostname.endsWith(`.${PAGES_ROOT_HOSTNAME}`) && hostname !== `dev.${PAGES_ROOT_HOSTNAME}`;
    const safeOrigin = isLocalhost || isCloudflarePreview ? DEV_BRANCH_ORIGIN : origin;
    return `${safeOrigin}/`;
}
