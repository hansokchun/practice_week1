export function getPhotoAccessibleLabel(photo = {}, index) {
    const label = [photo.placeName, photo.description, photo.title, photo.album]
        .map(value => String(value || '').trim()).find(Boolean) || '여행 사진';
    return Number.isInteger(index) && index >= 0 ? `${label} · ${index + 1}번째 사진` : label;
}
