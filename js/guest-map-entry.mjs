export function getHeaderUploadAction(currentUser) {
    return currentUser
        ? { label: '사진 추가', icon: 'add_a_photo' }
        : { label: '나만의 지도 만들기', icon: 'map' };
}

export function createGuestMapInvitationState() {
    let previousRoute = null;
    let dismissed = false;
    let previousAuthenticated = false;
    return {
        update({ route, currentUser = null, sessionReady = false }) {
            const authenticated = Boolean(currentUser);
            if (route !== previousRoute || previousAuthenticated !== authenticated) dismissed = false;
            previousRoute = route;
            previousAuthenticated = authenticated;
            return sessionReady && !currentUser && route === 'home' && !dismissed;
        },
        dismiss() { dismissed = true; }
    };
}
