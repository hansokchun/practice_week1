export const PHOTO_PAGE_SIZE = 16;

export function getPhotoPage(items = [], requestedPage = 1, pageSize = PHOTO_PAGE_SIZE) {
    const normalizedItems = Array.isArray(items) ? items : [];
    const normalizedPageSize = Math.max(1, Math.floor(Number(pageSize) || PHOTO_PAGE_SIZE));
    const totalPages = Math.max(1, Math.ceil(normalizedItems.length / normalizedPageSize));
    const currentPage = Math.min(totalPages, Math.max(1, Math.floor(Number(requestedPage) || 1)));
    const startIndex = (currentPage - 1) * normalizedPageSize;

    return {
        items: normalizedItems.slice(startIndex, startIndex + normalizedPageSize),
        currentPage,
        totalPages,
        hasPrevious: currentPage > 1,
        hasNext: currentPage < totalPages,
        shouldPaginate: normalizedItems.length > normalizedPageSize
    };
}
