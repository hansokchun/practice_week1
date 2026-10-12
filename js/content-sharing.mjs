import { getPhotoStoragePath } from './photo-storage.mjs';

function getCoverVersion(item) {
    const path = getPhotoStoragePath({ url: item.cover_url });
    if (!path) return '';
    // This checksum versions preview caches; it is not an authorization token.
    let hash = 2166136261;
    for (const character of path) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
    return (hash >>> 0).toString(36);
}

export function buildContentShare(origin, type, item = {}) {
    if (!['photo', 'album'].includes(type) || !item?.id || item.visibility !== 'public') return null;
    const version = type === 'album' ? getCoverVersion(item) : '';
    const url = `${String(origin).replace(/\/$/, '')}/share/${type}/${encodeURIComponent(item.id)}?v=2${version ? `&cover=${version}` : ''}`;
    return {
        url,
        imageUrl: `${url}&image=1`,
        title: String(item.title || item.description || (type === 'photo' ? '이끼 사진' : '이끼 여행 앨범')).slice(0, 100),
        description: '장소 아카이브',
        buttonTitle: type === 'photo' ? '사진 보기' : '앨범 보기'
    };
}

export function parseSharedPhotoId(hash = '') {
    return new URLSearchParams(String(hash).split('?')[1] || '').get('photo');
}
