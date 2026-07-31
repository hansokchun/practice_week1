const STORAGE_KEY = 'ikkyee.pendingOAuthProvider';
const SUPPORTED_PROVIDERS = new Set(['google', 'kakao']);
const PENDING_PROVIDER_TTL_MS = 15 * 60 * 1000;

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeAvatarUrl(value) {
    const url = normalizeText(value);
    return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

export function setPendingOAuthProvider(storage, provider, now = Date.now()) {
    if (!storage || !SUPPORTED_PROVIDERS.has(provider)) return null;
    storage.setItem(STORAGE_KEY, JSON.stringify({ provider, createdAt: now }));
    return provider;
}

export function takePendingOAuthProvider(storage, now = Date.now()) {
    if (!storage) return null;
    const value = storage.getItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY);
    if (SUPPORTED_PROVIDERS.has(value)) return value;

    try {
        const pending = JSON.parse(value);
        const isFresh = Number.isFinite(pending?.createdAt)
            && now - pending.createdAt >= 0
            && now - pending.createdAt <= PENDING_PROVIDER_TTL_MS;
        return isFresh && SUPPORTED_PROVIDERS.has(pending?.provider)
            ? pending.provider
            : null;
    } catch {
        return null;
    }
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
