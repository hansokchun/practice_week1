const WELCOME_NOTICES = [
    { id: 'welcome-location', icon: 'location_on', title: '사진 속 장소도 함께 나눠요', body: '사진을 공개하면 지도에서 촬영 장소도 볼 수 있어요. 집·직장처럼 소중한 일상이 드러나는 곳은 공유 전에 한 번 더 확인해 주세요.', route: '' },
    { id: 'welcome-upload', icon: 'add_a_photo', title: '첫 사진으로 나만의 지도를 채워볼까요?', body: '마음에 드는 여행 사진을 올려보세요. 사진 속 장소들이 모여 나만의 여행 지도가 돼요. 여기를 누르면 사진을 추가할 수 있어요.', route: 'upload' }
];

function readGuidance(storage, userId) {
    try {
        const value = JSON.parse(storage?.getItem(`ikkyee:guidance:${userId || 'guest'}`) || 'null');
        return { initialized: value?.initialized === true, pending: Array.isArray(value?.pending) ? value.pending.filter(id => WELCOME_NOTICES.some(item => item.id === id)) : [], uploadNoticeDismissed: value?.uploadNoticeDismissed === true };
    } catch {
        return { initialized: false, pending: [], uploadNoticeDismissed: false };
    }
}

function saveGuidance(storage, userId, value) {
    try { storage?.setItem(`ikkyee:guidance:${userId || 'guest'}`, JSON.stringify(value)); } catch {}
    return { welcomeNotices: WELCOME_NOTICES.filter(item => value.pending.includes(item.id)), uploadNoticeDismissed: value.uploadNoticeDismissed };
}

export function loadAccountGuidance(storage, userId) {
    const value = readGuidance(storage, userId);
    return { welcomeNotices: userId ? WELCOME_NOTICES.filter(item => value.pending.includes(item.id)) : [], uploadNoticeDismissed: value.uploadNoticeDismissed };
}

export function initializeAccountGuidance(storage, userId, isNewAccount = false) {
    if (!userId) return loadAccountGuidance(storage, userId);
    const value = readGuidance(storage, userId);
    if (!value.initialized) {
        value.initialized = true;
        value.pending = isNewAccount ? WELCOME_NOTICES.map(item => item.id) : [];
    }
    return saveGuidance(storage, userId, value);
}

export function dismissAccountGuidance(storage, userId, noticeId) {
    const value = readGuidance(storage, userId);
    if (noticeId === 'upload-location') value.uploadNoticeDismissed = true;
    else value.pending = value.pending.filter(id => id !== noticeId);
    return saveGuidance(storage, userId, value);
}
