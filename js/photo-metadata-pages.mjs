export async function fetchPhotoMetadataPages(sb, columns, pageSize = 200) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
        throw new RangeError('Invalid photo page size');
    }
    const photos = [];
    const cursors = new Set();
    let cursor = null;
    while (true) {
        let query = sb.from('photos').select(columns).order('id', { ascending: true });
        if (cursor !== null) query = query.gt('id', cursor);
        const { data, error } = await query.limit(pageSize);
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error('Invalid photo page');
        photos.push(...data);
        if (data.length < pageSize) break;
        const next = data.at(-1)?.id;
        if (typeof next !== 'string' || !next || cursors.has(next)) {
            throw new Error('Photo cursor did not advance');
        }
        cursors.add(next);
        cursor = next;
    }
    return photos.sort((a, b) => {
        if (a.date === b.date) return 0;
        if (a.date == null) return -1;
        if (b.date == null) return 1;
        return a.date < b.date ? 1 : -1;
    });
}
