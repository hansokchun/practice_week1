export function buildContentShare(origin, type, item = {}) {
    if (!['photo', 'album'].includes(type) || !item?.id || item.visibility !== 'public') return null;
    const url = `${String(origin).replace(/\/$/, '')}/share/${type}/${encodeURIComponent(item.id)}`;
    return {
        url,
        imageUrl: `${url}?image=1`,
        title: String(item.title || item.description || (type === 'photo' ? '이끼에서 만난 한 장면' : '이끼 여행 앨범')).slice(0, 100),
        description: type === 'photo' ? '사진 속 장소를 이끼에서 만나보세요.' : '여행의 사진과 장소를 함께 둘러보세요.',
        buttonTitle: type === 'photo' ? '사진 보기' : '앨범 보기'
    };
}

export function parseSharedPhotoId(hash = '') {
    return new URLSearchParams(String(hash).split('?')[1] || '').get('photo');
}
