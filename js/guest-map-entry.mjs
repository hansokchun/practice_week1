export function getHeaderUploadAction(currentUser) {
    return currentUser
        ? { label: '사진 추가', icon: 'add_a_photo' }
        : { label: '나만의 지도 만들기', icon: 'map' };
}

export function shouldShowHeaderMapDot({ currentUser = null, sessionReady = false } = {}) {
    return Boolean(sessionReady && !currentUser);
}
