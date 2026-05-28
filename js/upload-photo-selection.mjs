export function getSelectedUploadPhotos(photos = []) {
    return photos.filter((photo) => photo.selected !== false);
}

export function countSelectedUploadPhotos(photos = []) {
    return getSelectedUploadPhotos(photos).length;
}

export function toggleUploadPhotoSelection(photos = [], localId) {
    return photos.map((photo) => (
        photo.localId === localId
            ? { ...photo, selected: photo.selected === false }
            : photo
    ));
}
