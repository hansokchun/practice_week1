const LIBRARY_LABELS = {
    photos: '사진',
    likes: '좋아요한 사진',
    albums: '앨범'
};

export function getLibraryFailureState(section = 'photos', { online = true } = {}) {
    const label = LIBRARY_LABELS[section] || LIBRARY_LABELS.photos;
    return {
        title: `${label}을 불러오지 못했습니다.`,
        body: online
            ? '잠시 후 다시 시도해주세요.'
            : '인터넷 연결을 확인한 뒤 다시 시도해주세요.',
        action: '다시 시도'
    };
}

export function getUploadFailureState({ online = true } = {}) {
    return {
        title: '사진을 저장하지 못했습니다.',
        body: online
            ? '잠시 후 다시 시도해주세요. 로컬 초안은 그대로 유지됩니다.'
            : '인터넷 연결을 확인한 뒤 다시 시도해주세요. 로컬 초안은 그대로 유지됩니다.'
    };
}

export function getMapUnavailableState() {
    return {
        title: '지도를 불러오지 못했습니다.',
        body: '잠시 후 새로고침해주세요. 사진 목록은 계속 이용할 수 있습니다.',
        action: '새로고침'
    };
}
