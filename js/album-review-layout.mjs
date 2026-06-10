function getPhotoDateKey(photo) {
    const raw = photo?.date || photo?.created_at;
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey) {
    if (!dateKey) return '\uB0A0\uC9DC \uC5C6\uC74C';
    const [, month, day] = dateKey.split('-').map(Number);
    return `${month}\uC6D4 ${day}\uC77C`;
}

function getAspectRatio(photo) {
    const width = Number(photo?.width || photo?.naturalWidth || photo?.image_width);
    const height = Number(photo?.height || photo?.naturalHeight || photo?.image_height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
    const ratio = width / height;
    return Math.round(Math.min(1.8, Math.max(0.75, ratio)) * 100) / 100;
}

function getNextRowSize(remaining) {
    if (remaining <= 4) return remaining;
    if (remaining === 5) return 3;
    return remaining % 4 === 1 ? 3 : 4;
}

export function calculateAlbumReviewRowLayout(rowPhotos = [], availableWidth = 0, options = {}) {
    const gap = Number.isFinite(Number(options.gap)) ? Number(options.gap) : 6;
    const baseHeight = Number.isFinite(Number(options.baseHeight)) ? Number(options.baseHeight) : 220;
    const minHeight = Number.isFinite(Number(options.minHeight)) ? Number(options.minHeight) : 190;
    const maxHeight = Number.isFinite(Number(options.maxHeight)) ? Number(options.maxHeight) : 320;
    const ratios = rowPhotos.map((photo) => {
        const ratio = typeof photo === 'number' ? photo : Number(photo?.aspectRatio || photo?.ratio);
        return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    });
    if (!ratios.length) return { height: baseHeight, widths: [] };

    const gapsWidth = Math.max(0, ratios.length - 1) * gap;
    const usableWidth = Math.max(0, Number(availableWidth) - gapsWidth);
    const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);
    const fitHeight = ratioSum > 0 && usableWidth > 0 ? usableWidth / ratioSum : baseHeight;
    const height = Math.round(Math.min(maxHeight, Math.max(minHeight, fitHeight || baseHeight)));

    return {
        height,
        widths: ratios.map((ratio) => Math.round(ratio * height))
    };
}

function buildRows(photos) {
    const rows = [];
    let index = 0;
    while (index < photos.length) {
        const rowSize = getNextRowSize(photos.length - index);
        rows.push(photos.slice(index, index + rowSize));
        index += rowSize;
    }
    return rows;
}

export function getAlbumReviewDaySections(photos = []) {
    const groups = new Map();
    photos.forEach((photo, index) => {
        const dateKey = getPhotoDateKey(photo);
        const groupKey = dateKey || '__undated';
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push({
            ...photo,
            _albumReviewIndex: index,
            aspectRatio: getAspectRatio(photo)
        });
    });

    return [...groups.entries()]
        .sort(([a], [b]) => {
            if (a === '__undated') return 1;
            if (b === '__undated') return -1;
            return a.localeCompare(b);
        })
        .map(([dateKey, dayPhotos]) => ({
            dateLabel: formatDateLabel(dateKey === '__undated' ? null : dateKey),
            photoCount: dayPhotos.length,
            rows: buildRows(dayPhotos.sort((a, b) => a._albumReviewIndex - b._albumReviewIndex))
        }));
}
