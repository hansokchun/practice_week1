export function hasFileDrop(dataTransfer) {
    const types = Array.from(dataTransfer?.types || []);
    if (types.length && !types.includes('Files')) return false;
    const items = Array.from(dataTransfer?.items || []);
    if (items.length) return items.some((item) => item.kind === 'file');
    return Array.from(dataTransfer?.files || []).length > 0;
}

export function getDroppedFiles(dataTransfer) {
    if (!hasFileDrop(dataTransfer)) return [];
    return Array.from(dataTransfer?.files || []);
}

export function getUploadDropzoneClass(isDragging) {
    return isDragging ? 'upload-dropzone is-dragging' : 'upload-dropzone';
}
