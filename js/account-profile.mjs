function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeAvatarUrl(value) {
    const url = normalizeText(value);
    return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

export function getProviderAccountProfile(user) {
    const metadata = user?.user_metadata || {};
    const nickname = normalizeText(
        metadata.nickname
        || metadata.full_name
        || metadata.name
        || user?.email?.split('@')[0]
        || 'Guest'
    );

    return {
        nickname,
        bio: normalizeText(metadata.bio),
        avatarUrl: '',
        coverPath: '',
        coverUrl: ''
    };
}

export function resolveAccountProfile(user, storedProfile = null) {
    const providerProfile = getProviderAccountProfile(user);
    if (!storedProfile?.id) return providerProfile;

    return {
        nickname: normalizeText(storedProfile.nickname) || providerProfile.nickname,
        bio: normalizeText(storedProfile.bio),
        avatarUrl: normalizeAvatarUrl(storedProfile.avatar_url),
        coverPath: normalizeText(storedProfile.cover_path),
        coverUrl: normalizeAvatarUrl(storedProfile.cover_url)
    };
}
