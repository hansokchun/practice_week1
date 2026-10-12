const checked = async query => {
    const result = await query;
    if (result.error) throw result.error;
    return result;
};

export function createAdminAccountsRepository(client) {
    const getAccount = async id => {
        const result = await client.auth.admin.getUserById(id);
        if (result.error) throw result.error;
        return result.data?.user || null;
    };
    return {
        async authenticate(token) {
            const { data, error } = await client.auth.getUser(token);
            if (error || !data?.user?.id) return null;
            return getAccount(data.user.id);
        },
        getAccount,
        async listAccounts({ page, search, status }) {
            return (await checked(client.rpc('admin_account_page', { p_page: page, p_search: search, p_status: status }))).data;
        },
        async inspectAccount(id) {
            const user = await getAccount(id);
            if (!user) throw new Error('not_found');
            const [profile, photos, allCount, publicCount, albums, history] = await Promise.all([
                checked(client.from('profiles').select('id,nickname,bio').eq('id', id).maybeSingle()),
                checked(client.from('photos').select('id,title,date,created_at,visibility,thumbnail_path,preview_path').eq('owner_id', id).order('created_at', { ascending: false }).limit(12)),
                checked(client.from('photos').select('id', { count: 'exact', head: true }).eq('owner_id', id)),
                checked(client.from('photos').select('id', { count: 'exact', head: true }).eq('owner_id', id).eq('visibility', 'public')),
                checked(client.from('albums').select('id', { count: 'exact', head: true }).eq('owner_id', id)),
                checked(client.from('account_moderation_events').select('id,action,reason,state,created_at,banned_until,actor_id').eq('target_user_id', id).order('created_at', { ascending: false }).limit(20))
            ]);
            const derivative = photo => [photo.thumbnail_path, photo.preview_path].find(path => typeof path === 'string'
                && (path.startsWith(`${id}/thumbnails/`) || path.startsWith(`${id}/previews/`)) && !path.includes('..') && !path.includes('\\'));
            const paths = [...new Set(photos.data.map(derivative).filter(Boolean))];
            const signed = paths.length ? await checked(client.storage.from('photos').createSignedUrls(paths, 300)) : { data: [] };
            const urls = new Map(signed.data.filter(item => item.signedUrl).map(item => [item.path, item.signedUrl]));
            return {
                account: { id: user.id, email: user.email || '', created_at: user.created_at, last_sign_in_at: user.last_sign_in_at,
                    providers: user.app_metadata?.providers || [], role: user.app_metadata?.role || 'member', banned_until: user.banned_until || null,
                    email_confirmed: Boolean(user.email_confirmed_at), nickname: profile.data?.nickname || '이름 없음', bio: profile.data?.bio || '',
                    photo_count: allCount.count || 0, public_count: publicCount.count || 0, album_count: albums.count || 0 },
                photos: photos.data.map(photo => ({ id: photo.id, title: photo.title, date: photo.date, created_at: photo.created_at, visibility: photo.visibility,
                    thumbnailUrl: urls.get(derivative(photo)) || '' })),
                history: history.data
            };
        },
        async moderateAccount({ actorId, userId, operation, reason, durationHours, requestId }) {
            const old = await checked(client.from('account_moderation_events').select('id,target_user_id,actor_id,action,reason,duration_hours,state').eq('id', requestId).maybeSingle());
            if (old.data) {
                if (old.data.target_user_id === userId && old.data.actor_id === actorId && old.data.action === operation
                    && old.data.reason === reason && old.data.duration_hours === durationHours && old.data.state === 'completed') return { completed: true };
                throw Object.assign(new Error(), { code: 'moderation_busy' });
            }
            const inserted = await client.from('account_moderation_events').insert({ id: requestId, target_user_id: userId, actor_id: actorId, action: operation, reason, duration_hours: durationHours });
            if (inserted.error) throw Object.assign(new Error(), { code: inserted.error.code === '23505' ? 'moderation_busy' : 'audit_failed' });
            let bannedUntil = null;
            try {
                if (operation !== 'warning') {
                    const { data, error } = await client.auth.admin.updateUserById(userId, { ban_duration: operation === 'ban' ? `${durationHours}h` : 'none' });
                    if (error || !data?.user) throw error || new Error('moderation_failed');
                    bannedUntil = operation === 'ban' ? data.user.banned_until : null;
                }
                await checked(client.from('account_moderation_events').update({ state: 'completed', banned_until: bannedUntil }).eq('id', requestId));
            } catch (error) {
                // Preserve the audit record even when Auth or the final audit write fails.
                await client.from('account_moderation_events').update({ state: 'failed', banned_until: bannedUntil }).eq('id', requestId);
                throw error;
            }
            return { completed: true, bannedUntil };
        }
    };
}
