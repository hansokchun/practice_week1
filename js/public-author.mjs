export function getPublicAuthorName(album, { currentUser = null, profileNames = {} } = {}) {
    const ownerId = album?.owner_id;
    if (profileNames[ownerId]) return profileNames[ownerId];
    if (ownerId && currentUser?.id === ownerId) {
        return currentUser.user_metadata?.nickname
            || currentUser.email?.split('@')[0]
            || 'You';
    }
    if (ownerId === 'demo') return 'Ikkyee';
    if (ownerId) return `User ${String(ownerId).slice(0, 4)}`;
    return 'Ikkyee';
}

export function getAuthorInitials(name) {
    const words = String(name || 'Ikkyee').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return String(words[0] || 'IK').slice(0, 2).toUpperCase();
}
