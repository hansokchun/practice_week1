export function normalizeNickname(value) {
    const nickname = typeof value === 'string' ? value.trim() : '';
    if (!nickname) {
        throw new Error('nickname required');
    }
    return nickname;
}

export function getUserFallbackName(userId) {
    if (!userId) return 'User';
    return `User ${String(userId).substring(0, 4)}`;
}

export function getProfileUserId(profile) {
    return profile?.id || profile?.user_id || profile?.owner_id || profile?.userId || '';
}

export function getProfileDisplayName(profile) {
    const fields = [
        profile?.nickname,
        profile?.display_name,
        profile?.name,
        profile?.full_name,
        profile?.username
    ];
    const name = fields.find((value) => typeof value === 'string' && value.trim());
    if (name) return name.trim();
    const email = typeof profile?.email === 'string' ? profile.email.trim() : '';
    return email && email.includes('@') ? email.split('@')[0] : '';
}

export function createProfileNameResolver({ fetchProfilesByIds }) {
    const cache = new Map();
    const missing = new Set();

    function prime(userId, nickname) {
        if (!userId) return;
        const normalized = typeof nickname === 'string' ? nickname.trim() : '';
        if (normalized) {
            cache.set(userId, normalized);
            missing.delete(userId);
        }
    }

    async function resolve(userId, fallbackName = getUserFallbackName(userId)) {
        if (!userId) return fallbackName;
        if (cache.has(userId)) return cache.get(userId);
        if (missing.has(userId)) return fallbackName;

        try {
            const rows = await fetchProfilesByIds([userId]);
            const profile = (rows || []).find((row) => row && getProfileUserId(row) === userId);
            const nickname = getProfileDisplayName(profile);
            if (nickname) {
                cache.set(userId, nickname);
                return nickname;
            }
        } catch (error) {
            console.warn('Profile nickname lookup failed:', error);
        }

        missing.add(userId);
        return fallbackName;
    }

    async function resolveMany(userIds) {
        const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
        const result = {};
        const idsToFetch = uniqueIds.filter((id) => !cache.has(id) && !missing.has(id));

        if (idsToFetch.length > 0) {
            try {
                const rows = await fetchProfilesByIds(idsToFetch);
                const found = new Set();
                (rows || []).forEach((row) => {
                    const userId = getProfileUserId(row);
                    const nickname = getProfileDisplayName(row);
                    if (userId && nickname) {
                        cache.set(userId, nickname);
                        found.add(userId);
                    }
                });
                idsToFetch.forEach((id) => {
                    if (!found.has(id)) missing.add(id);
                });
            } catch (error) {
                console.warn('Profile nickname lookup failed:', error);
                idsToFetch.forEach((id) => missing.add(id));
            }
        }

        uniqueIds.forEach((id) => {
            result[id] = cache.get(id) || getUserFallbackName(id);
        });
        return result;
    }

    return { prime, resolve, resolveMany };
}
