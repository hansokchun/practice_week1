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

export function appendUploadPhotos(existingPhotos = [], files = [], {
    createLocalId = (file, index) => `${Date.now()}-${index}`,
    createObjectUrl = (file) => URL.createObjectURL(file)
} = {}) {
    return [
        ...existingPhotos,
        ...Array.from(files).map((file, index) => ({
            localId: createLocalId(file, index),
            name: file.name,
            url: createObjectUrl(file),
            file,
            selected: true
        }))
    ];
}
