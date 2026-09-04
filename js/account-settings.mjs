export const DEFAULT_ACCOUNT_SETTINGS = Object.freeze({
    defaultVisibility: 'private',
    missingLocationNotifications: true,
    librarySummaryNotifications: true
});

export function normalizeAccountSettings(value = {}) {
    return {
        defaultVisibility: value?.defaultVisibility === 'public' ? 'public' : 'private',
        missingLocationNotifications: typeof value?.missingLocationNotifications === 'boolean'
            ? value.missingLocationNotifications
            : DEFAULT_ACCOUNT_SETTINGS.missingLocationNotifications,
        librarySummaryNotifications: typeof value?.librarySummaryNotifications === 'boolean'
            ? value.librarySummaryNotifications
            : DEFAULT_ACCOUNT_SETTINGS.librarySummaryNotifications
    };
}

export function getAccountSettingsStorageKey(userId = '') {
    return `ikkyee:s:${userId || 'guest'}`;
}

export function loadAccountSettings(storage, userId = '') {
    if (!storage || !userId) return { ...DEFAULT_ACCOUNT_SETTINGS };
    try {
        const raw = storage.getItem(getAccountSettingsStorageKey(userId));
        return raw ? normalizeAccountSettings(JSON.parse(raw)) : { ...DEFAULT_ACCOUNT_SETTINGS };
    } catch { return { ...DEFAULT_ACCOUNT_SETTINGS }; }
}

export function saveAccountSettings(storage, userId = '', value = {}) {
    const settings = normalizeAccountSettings(value);
    if (!storage || !userId) return settings;
    try {
        storage.setItem(getAccountSettingsStorageKey(userId), JSON.stringify(settings));
    } catch {}
    return settings;
}

export function getUploadVisibilityPlan({
    defaultVisibility = 'private',
    photoCount = 0,
    publicAllowance = Number.POSITIVE_INFINITY
} = {}) {
    const count = Math.max(0, Math.trunc(Number(photoCount) || 0));
    const allowance = Number.isFinite(publicAllowance)
        ? Math.max(0, Math.trunc(Number(publicAllowance) || 0))
        : count;
    const publicCount = defaultVisibility === 'public'
        ? Math.min(count, allowance)
        : 0;

    return Array.from({ length: count }, (_, index) => (
        index < publicCount ? 'public' : 'private'
    ));
}
