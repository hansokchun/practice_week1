const STORAGE_KEY = 'ikkyee.pendingOAuthProvider';
const SUPPORTED_PROVIDERS = new Set(['google', 'kakao']);

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeAvatarUrl(value) {
    const url = normalizeText(value);
    return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

export function setPendingOAuthProvider(storage, provider) {
    if (!storage || !SUPPORTED_PROVIDERS.has(provider)) return null;
    storage.setItem(STORAGE_KEY, provider);
    return provider;
}

export function takePendingOAuthProvider(storage) {
    if (!storage) return null;
    const provider = storage.getItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY);
    return SUPPORTED_PROVIDERS.has(provider) ? provider : null;
}

export function getOAuthIdentityProfile(user, provider) {
    const identity = (user?.identities || []).find((candidate) => candidate?.provider === provider);
    if (!identity) return null;
    const metadata = identity.identity_data || {};

    return {
        provider,
        nickname: normalizeText(
            metadata.full_name
            || metadata.name
            || metadata.preferred_username
            || metadata.user_name
        ),
        avatarUrl: normalizeAvatarUrl(metadata.avatar_url || metadata.picture)
    };
}

export function mergeOAuthIdentityProfile(currentProfile = {}, identityProfile = {}) {
    return {
        nickname: normalizeText(identityProfile.nickname) || normalizeText(currentProfile.nickname) || 'Guest',
        bio: normalizeText(currentProfile.bio),
        avatarUrl: normalizeAvatarUrl(identityProfile.avatarUrl) || normalizeAvatarUrl(currentProfile.avatarUrl)
    };
}
