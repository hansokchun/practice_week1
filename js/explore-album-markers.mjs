function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function getLocatedPublicAlbums(albums = []) {
    return albums
        .filter((album) => hasCoordinate(album.lat) && hasCoordinate(album.lng))
        .map((album) => ({
            id: album.id,
            title: album.title,
            note: album.note || '',
            cover_url: album.cover_url,
            owner_id: album.owner_id,
            visibility: album.visibility,
            lat: Number(album.lat),
            lng: Number(album.lng),
            photo_count: Number(album.photo_count || album.photos?.length || 0),
            places: Number(album.places || album.photos?.filter((photo) => hasCoordinate(photo.lat) && hasCoordinate(photo.lng)).length || 1),
            type: 'album'
        }));
}
