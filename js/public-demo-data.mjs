const demoAlbums = [
    {
        id: 'demo-jeju',
        title: 'Jeju East Coast Drive',
        note: '성산에서 월정리까지 이어지는 바람 많은 해안 길. 공개할 사진만 골라 만든 여행 기록입니다.',
        visibility: 'public',
        cover_url: 'images/main_bg2.jpg',
        owner_id: 'demo',
        photo_count: 3,
        places: 3,
        lat: 33.4507,
        lng: 126.5707
    },
    {
        id: 'demo-tokyo',
        title: 'Tokyo Night Walk',
        note: '골목과 밤의 빛을 따라 만든 공개 여행 앨범입니다.',
        visibility: 'public',
        cover_url: 'images/main_bg3.jpg',
        owner_id: 'demo',
        photo_count: 3,
        places: 3,
        lat: 35.6762,
        lng: 139.6503
    },
    {
        id: 'demo-italy',
        title: 'Italian Blue Week',
        note: '푸른 바다와 오래된 골목을 따라 걸은 공개 여행 기록입니다.',
        visibility: 'public',
        cover_url: 'images/main_bg5.jpg',
        owner_id: 'demo',
        photo_count: 3,
        places: 3,
        lat: 41.9028,
        lng: 12.4964
    }
];

const demoPhotos = {
    'demo-jeju': [
        { id: 'demo-jeju-1', name: '성산 일출봉 산책', url: 'images/main_bg2.jpg', lat: 33.4582, lng: 126.9425, date: '2026-05-12T09:20:00.000Z', description: '바다 쪽 산책로에서 찍은 공개 예시 사진입니다.' },
        { id: 'demo-jeju-2', name: '월정리 해변', url: 'images/main_bg1.jpg', lat: 33.5563, lng: 126.7958, date: '2026-05-12T15:10:00.000Z', description: '사진 위치 핀이 지도 위에서 어떻게 보이는지 확인하기 위한 샘플입니다.' },
        { id: 'demo-jeju-3', name: '세화리 노을', url: 'images/main_bg4.jpg', lat: 33.5262, lng: 126.8583, date: '2026-05-13T18:25:00.000Z', description: '가까운 위치의 공개 사진 핀 중첩을 확인할 수 있는 샘플입니다.' }
    ],
    'demo-tokyo': [
        { id: 'demo-tokyo-1', name: '시부야 야경', url: 'images/main_bg3.jpg', lat: 35.6595, lng: 139.7005, date: '2026-05-13T20:30:00.000Z', description: '도쿄 공개 사진 위치 예시입니다.' },
        { id: 'demo-tokyo-2', name: '긴자 골목', url: 'images/main_bg4.jpg', lat: 35.6719, lng: 139.7658, date: '2026-05-14T18:05:00.000Z', description: '확대/축소 시 지도에 붙어 움직이는 예시 핀입니다.' },
        { id: 'demo-tokyo-3', name: '아사쿠사 저녁', url: 'images/main_bg1.jpg', lat: 35.7148, lng: 139.7967, date: '2026-05-14T19:40:00.000Z', description: '검색 후 이동한 지도에서 공개 핀을 확인하기 위한 샘플입니다.' }
    ],
    'demo-italy': [
        { id: 'demo-italy-1', name: '로마 저녁 산책', url: 'images/main_bg5.jpg', lat: 41.9028, lng: 12.4964, date: '2026-05-15T17:40:00.000Z', description: '실제 좌표가 있는 공개 사진 샘플입니다.' },
        { id: 'demo-italy-2', name: '나폴리 항구', url: 'images/main_bg2.jpg', lat: 40.8518, lng: 14.2681, date: '2026-05-16T12:20:00.000Z', description: '멀리 떨어진 공개 사진 핀이 따로 보이는지 확인할 수 있습니다.' },
        { id: 'demo-italy-3', name: '포지타노 골목', url: 'images/main_bg3.jpg', lat: 40.6281, lng: 14.4849, date: '2026-05-17T16:15:00.000Z', description: '앨범 상세에서 날짜별 사진 배치를 확인하기 위한 샘플입니다.' }
    ]
};

export function getPublicDemoAlbums() {
    return demoAlbums.map((album) => ({ ...album }));
}

export function getPublicDemoPhotos(album) {
    return (demoPhotos[album.id] || []).map((photo) => ({
        ...photo,
        album: album.title,
        album_id: album.id,
        owner_id: album.owner_id,
        visibility: 'public',
        shared: true
    }));
}
