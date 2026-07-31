import { getOAuthRedirectUrl } from './oauth-redirect-url.mjs';

function isMobileUserAgent(userAgent = '') {
    return /android|iphone|ipad|ipod|mobile/i.test(String(userAgent || ''));
}

export function getOAuthProviderOptions(
    provider,
    locationLike = globalThis.window?.location,
    userAgent = globalThis.window?.navigator?.userAgent
) {
    const options = {
        redirectTo: getOAuthRedirectUrl(locationLike)
    };

    if (provider === 'kakao' && isMobileUserAgent(userAgent)) {
        options.queryParams = { prompt: 'login' };
    }

    return options;
}
