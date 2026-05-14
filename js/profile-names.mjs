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
            const profile = (rows || []).find((row) => row && row.id === userId);
            const nickname = profile && typeof profile.nickname === 'string' ? profile.nickname.trim() : '';
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
                    const nickname = row && typeof row.nickname === 'string' ? row.nickname.trim() : '';
                    if (row && row.id && nickname) {
                        cache.set(row.id, nickname);
                        found.add(row.id);
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

