import {
    MAIN_BG_1_URL,
    MAIN_BG_2_URL,
    MAIN_BG_3_URL,
    MAIN_BG_4_URL,
    MAIN_BG_5_URL
} from './image-assets.mjs';

const sampleAlbum = {
    id: 'sample-public-photos',
    title: 'Public Photo Pin Samples',
    note: 'A temporary public photo sample set for checking Explore map pins.',
    visibility: 'public',
    cover_url: MAIN_BG_2_URL,
    owner_id: 'sample',
    photo_count: 8,
    places: 8,
    lat: 36.12,
    lng: 127.88
};

const samplePhotos = [
    {
        id: 'sample-public-photo-1',
        name: 'Gyeongbokgung Gate',
        url: MAIN_BG_1_URL,
        lat: 37.5796,
        lng: 126.9770,
        date: '2026-05-12T09:20:00.000Z',
        description: 'Public sample photo with real coordinates.'
    },
    {
        id: 'sample-public-photo-2',
        name: 'Bukchon Alley',
        url: MAIN_BG_2_URL,
        lat: 37.5826,
        lng: 126.9830,
        date: '2026-05-12T11:10:00.000Z',
        description: 'Nearby sample photo for cluster split checks.'
    },
    {
        id: 'sample-public-photo-3',
        name: 'Namsan View',
        url: MAIN_BG_3_URL,
        lat: 37.5512,
        lng: 126.9882,
        date: '2026-05-12T16:45:00.000Z',
        description: 'Public sample photo in Seoul.'
    },
    {
        id: 'sample-public-photo-4',
        name: 'Seoul Forest',
        url: MAIN_BG_4_URL,
        lat: 37.5444,
        lng: 127.0374,
        date: '2026-05-13T10:15:00.000Z',
        description: 'Public sample photo east of the city center.'
    },
    {
        id: 'sample-public-photo-5',
        name: 'Busan Harbor',
        url: MAIN_BG_5_URL,
        lat: 35.0969,
        lng: 129.0403,
        date: '2026-05-14T14:30:00.000Z',
        description: 'Public sample photo in Busan.'
    },
    {
        id: 'sample-public-photo-6',
        name: 'Jeju Seongsan',
        url: MAIN_BG_2_URL,
        lat: 33.4582,
        lng: 126.9425,
        date: '2026-05-15T08:35:00.000Z',
        description: 'Public sample photo in Jeju.'
    },
    {
        id: 'sample-public-photo-7',
        name: 'Sokcho Beach',
        url: MAIN_BG_1_URL,
        lat: 38.1906,
        lng: 128.6034,
        date: '2026-05-16T17:50:00.000Z',
        description: 'Public sample photo on the east coast.'
    },
    {
        id: 'sample-public-photo-8',
        name: 'Daejeon Station',
        url: MAIN_BG_3_URL,
        lat: 36.3325,
        lng: 127.4348,
        date: '2026-05-17T12:05:00.000Z',
        description: 'Public sample photo in central Korea.'
    }
];

export function getPublicDemoAlbums() {
    return [{ ...sampleAlbum }];
}

export function getPublicDemoPhotos(album = sampleAlbum) {
    return samplePhotos.map((photo) => ({
        ...photo,
        album: album.title,
        album_id: album.id,
        owner_id: album.owner_id,
        visibility: 'public',
        location_precision: 'exact',
        shared: true
    }));
}

export function getPublicDemoAlbumEntries() {
    return getPublicDemoAlbums().map((album) => {
        const photos = getPublicDemoPhotos(album);
        return {
            ...album,
            photo_count: photos.length,
            places: photos.length,
            photos
        };
    });
}
