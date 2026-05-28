export function getVisibilityLabel(mode) {
    if (mode === 'public') return '공개';
    if (mode === 'link') return '링크 공유';
    return '비공개';
}

export function getVisibilityStatusText(mode) {
    return `현재 상태: ${getVisibilityLabel(mode)}`;
}
