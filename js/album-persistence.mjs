// 한 번의 DB 트랜잭션에서 앨범 연결과 사진 소속을 함께 저장합니다.
export async function mutateAlbumPhotos(sb, albumId, photoIds, mode) {
    try {
        if (!albumId || !['append', 'replace'].includes(mode) || !Array.isArray(photoIds)) {
            throw new Error('앨범 사진 저장 요청이 올바르지 않습니다.');
        }
        const ids = [...new Set(photoIds.filter(Boolean).map(String))];
        if (mode === 'append' && ids.length === 0) return { data: [], error: null };
        const { data, error } = await sb.rpc('mutate_album_photos', {
            target_album_id: albumId,
            selected_photo_ids: ids,
            mutation_mode: mode
        });
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}
