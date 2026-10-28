export function getPublicAuthorName(album, { currentUser = null, profileNames = {} } = {}) {
    const ownerId = album?.owner_id;
    if (profileNames[ownerId]) return profileNames[ownerId];
    if (ownerId && currentUser?.id === ownerId) {
        return currentUser.user_metadata?.nickname
            || currentUser.email?.split('@')[0]
            || 'You';
    }
    if (ownerId === 'demo') return '여행자';
    if (ownerId) return `여행자 ${String(ownerId).slice(0, 4)}`;
    return '여행자';
}

export function getAuthorInitials(name) {
    const words = String(name || '여행자').trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    const single = String(words[0] || '여행자');
    return /[가-힣]/.test(single) ? single.slice(0, 1) : single.slice(0, 2).toUpperCase();
}
