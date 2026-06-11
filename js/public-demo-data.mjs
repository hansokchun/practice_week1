const sampleAlbum = {
    id: 'sample-public-photos',
    title: 'Public Photo Pin Samples',
    note: 'A temporary public photo sample set for checking Explore map pins.',
    visibility: 'public',
    cover_url: 'images/main_bg2.jpg',
    owner_id: 'sample',
    photo_count: 200,
    places: 200,
    lat: 36.12,
    lng: 127.88
};

const baseSamplePhotos = [
    {
        id: 'sample-public-photo-1',
        name: 'Gyeongbokgung Gate',
        url: 'images/main_bg1.jpg',
        lat: 37.5796,
        lng: 126.9770,
        date: '2026-05-12T09:20:00.000Z',
        description: 'Public sample photo with real coordinates.'
    },
    {
        id: 'sample-public-photo-2',
        name: 'Bukchon Alley',
        url: 'images/main_bg2.jpg',
        lat: 37.5826,
        lng: 126.9830,
        date: '2026-05-12T11:10:00.000Z',
        description: 'Nearby sample photo for cluster split checks.'
    },
    {
        id: 'sample-public-photo-3',
        name: 'Namsan View',
        url: 'images/main_bg3.jpg',
        lat: 37.5512,
        lng: 126.9882,
        date: '2026-05-12T16:45:00.000Z',
        description: 'Public sample photo in Seoul.'
    },
    {
        id: 'sample-public-photo-4',
        name: 'Seoul Forest',
        url: 'images/main_bg4.jpg',
        lat: 37.5444,
        lng: 127.0374,
        date: '2026-05-13T10:15:00.000Z',
        description: 'Public sample photo east of the city center.'
    },
    {
        id: 'sample-public-photo-5',
        name: 'Busan Harbor',
        url: 'images/main_bg5.jpg',
        lat: 35.0969,
        lng: 129.0403,
        date: '2026-05-14T14:30:00.000Z',
        description: 'Public sample photo in Busan.'
    },
    {
        id: 'sample-public-photo-6',
        name: 'Jeju Seongsan',
        url: 'images/main_bg2.jpg',
        lat: 33.4582,
        lng: 126.9425,
        date: '2026-05-15T08:35:00.000Z',
        description: 'Public sample photo in Jeju.'
    },
    {
        id: 'sample-public-photo-7',
        name: 'Sokcho Beach',
        url: 'images/main_bg1.jpg',
        lat: 38.1906,
        lng: 128.6034,
        date: '2026-05-16T17:50:00.000Z',
        description: 'Public sample photo on the east coast.'
    },
    {
        id: 'sample-public-photo-8',
        name: 'Daejeon Station',
        url: 'images/main_bg3.jpg',
        lat: 36.3325,
        lng: 127.4348,
        date: '2026-05-17T12:05:00.000Z',
        description: 'Public sample photo in central Korea.'
    }
];

const sampleCities = [
    { name: 'Seoul', lat: 37.5665, lng: 126.9780, image: 'images/main_bg1.jpg' },
    { name: 'Busan', lat: 35.1796, lng: 129.0756, image: 'images/main_bg4.jpg' },
    { name: 'Jeju', lat: 33.4582, lng: 126.9425, image: 'images/main_bg2.jpg' },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503, image: 'images/main_bg5.jpg' },
    { name: 'Kyoto', lat: 35.0116, lng: 135.7681, image: 'images/main_bg3.jpg' }
];

function buildGeneratedSamplePhoto(index) {
    const city = sampleCities[index % sampleCities.length];
    const ring = Math.floor(index / sampleCities.length);
    const angle = ((index * 137.508) % 360) * (Math.PI / 180);
    const radius = 0.01 + ((ring % 8) * 0.006);
    return {
        id: `sample-public-photo-${index + 1}`,
        name: `${city.name} public photo ${index + 1}`,
        url: city.image,
        lat: Number((city.lat + (Math.sin(angle) * radius)).toFixed(6)),
        lng: Number((city.lng + (Math.cos(angle) * radius)).toFixed(6)),
        date: new Date(Date.UTC(2026, 4, 12 + (index % 18), 8 + (index % 10), (index * 7) % 60)).toISOString(),
        description: `Public sample photo near ${city.name}.`
    };
}

const samplePhotos = Array.from({ length: 200 }, (_, index) => (
    index < baseSamplePhotos.length ? baseSamplePhotos[index] : buildGeneratedSamplePhoto(index)
));

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
