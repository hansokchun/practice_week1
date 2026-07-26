import { getOAuthRedirectUrl } from './oauth-redirect-url.mjs';

export function getOAuthProviderOptions(provider, locationLike = window.location) {
    return {
        redirectTo: getOAuthRedirectUrl(locationLike)
    };
}
