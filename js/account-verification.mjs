const VERIFIED_SOCIAL_PROVIDERS = new Set(['google', 'kakao']);

export function isVerifiedAccount(user = null) {
    if (!user) return false;
    if (user.email_confirmed_at || user.confirmed_at) return true;

    const primaryProvider = String(user.app_metadata?.provider || '').toLowerCase();
    const linkedProviders = Array.isArray(user.app_metadata?.providers)
        ? user.app_metadata.providers.map((provider) => String(provider).toLowerCase())
        : [];

    return VERIFIED_SOCIAL_PROVIDERS.has(primaryProvider)
        || linkedProviders.some((provider) => VERIFIED_SOCIAL_PROVIDERS.has(provider));
}
