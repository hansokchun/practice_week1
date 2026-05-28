export function getDroppedFiles(dataTransfer) {
    return Array.from(dataTransfer?.files || []);
}

export function getUploadDropzoneClass(isDragging) {
    return isDragging ? 'upload-dropzone is-dragging' : 'upload-dropzone';
}
