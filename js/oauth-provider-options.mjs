import { getOAuthRedirectUrl } from './oauth-redirect-url.mjs';

const KAKAO_PROFILE_SCOPES = 'profile_nickname profile_image';

export function getOAuthProviderOptions(provider, locationLike = window.location) {
    const options = {
        redirectTo: getOAuthRedirectUrl(locationLike)
    };

    if (provider === 'kakao') {
        options.scopes = KAKAO_PROFILE_SCOPES;
    }

    return options;
}
