export function getNextExplorePhotoScope(scope) {
    return scope === 'mine' ? 'others' : 'mine';
}

export function getExploreScopeControl(scope) {
    return scope === 'mine'
        ? { icon: 'person', label: '내 사진', pressed: true }
        : { icon: 'groups', label: '다른 사람 사진', pressed: false };
}
