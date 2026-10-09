export function isLocalLandingUpload(photo = {}) {
    return Boolean(photo.owner_id && photo.storage_path?.startsWith(`${photo.owner_id}/landing/`));
}

export async function cleanupLandingUploads(photos, ownerId, retainedIds, dependencies, pendingPaths = []) {
    const retained = new Set(retainedIds.map(String));
    const deletedIds = [];
    const paths = new Set(pendingPaths.filter(path => typeof path === 'string' && path.startsWith(`${ownerId}/`)));
    let error = null;
    for (const photo of photos) {
        if (!ownerId || photo.owner_id !== ownerId || !isLocalLandingUpload(photo) || retained.has(String(photo.id))) continue;
        try {
            const result = await dependencies.claim(photo.id);
            if (result.error) throw result.error;
            for (const deleted of result.data || []) {
                deletedIds.push(String(deleted.id));
                for (const path of [deleted.storage_path, deleted.thumbnail_path, deleted.preview_path]) {
                    if (typeof path === 'string' && path.startsWith(`${ownerId}/`)) paths.add(path);
                }
            }
        } catch (failure) {
            error ||= failure;
        }
    }
    if (paths.size) {
        try {
            const result = await dependencies.remove([...paths]);
            if (result.error) throw result.error;
            paths.clear();
        } catch (failure) {
            error ||= failure;
        }
    }
    return { deletedIds, pendingPaths: [...paths], error };
}
