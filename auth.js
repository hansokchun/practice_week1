/**
 * auth.js — Supabase 올인원 모듈
 * 인증(Auth) + 데이터베이스(DB) + 파일저장소(Storage) 헬퍼를 한 곳에서 관리
 * 
 * 왜 한 파일에 모았나:
 * Supabase 클라이언트 인스턴스를 싱글톤으로 유지하고,
 * 모든 페이지(index.html, login.html)에서 동일한 설정으로 재사용하기 위함.
 */

import { getStorageUploadOptions } from './js/storage-upload-options.mjs';
import { getOAuthProviderOptions } from './js/oauth-provider-options.mjs';
import {
    applySignedAlbumCoverUrls,
    applySignedPhotoUrls,
    getPhotoStoragePath
} from './js/photo-storage.mjs';

const SUPABASE_URL = 'https://pqczcponriukilrtpbdl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m158oMsJtKHn2sUD3m7x-w_Rs6swjl8';
const PROFILE_SELECT_COLUMNS = 'id,nickname,bio,avatar_url';
const PHOTO_SELECT_COLUMNS = 'id,url,storage_path,date,created_at,title,description,lat,lng,location_precision,liked,shared,owner_id,album,album_id,visibility,geo_source,ai_tags,ai_summary,ai_scene,ai_moods,ai_analysis_status,ai_analyzed_at,ai_analysis_model';
const COMMENT_SELECT_COLUMNS = 'id,photo_id,text,date,author_id';
const ALBUM_SELECT_COLUMNS = 'id,owner_id,title,note,visibility,cover_url,date_start,date_end,photo_count,created_at';
const ALBUM_PHOTO_SELECT_COLUMNS = 'album_id,photo_id,sort_order';
const LANDING_SECTION_SELECT_COLUMNS = 'id,title,description,sort_order,is_visible,created_at,updated_at';
const LANDING_SECTION_PHOTO_SELECT_COLUMNS = 'section_id,photo_id,sort_order';

let _supabaseClient = null;

function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        throw new Error('Supabase SDK 로드 실패. <script> 태그 확인 필요.');
    }
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabaseClient;
}

function getAuthOptions(options = {}) {
    const authOptions = {};
    if (options.captchaToken) authOptions.captchaToken = options.captchaToken;
    if (options.redirectTo) authOptions.redirectTo = options.redirectTo;
    return authOptions;
}

function getSignUpAuthOptions(options = {}) {
    const authOptions = getAuthOptions(options);
    delete authOptions.redirectTo;
    if (options.redirectTo) authOptions.emailRedirectTo = options.redirectTo;
    return authOptions;
}

async function hydrateSignedPhotoUrls(sb, photos = []) {
    const paths = [...new Set(photos.map(getPhotoStoragePath).filter(Boolean))];
    if (!paths.length) return photos;

    const { data, error } = await sb.storage
        .from('photos')
        .createSignedUrls(paths, 900);
    if (error) return photos;

    const signedUrlByPath = new Map(
        (data || [])
            .filter((item) => item?.path && item?.signedUrl)
            .map((item) => [item.path, item.signedUrl])
    );
    return applySignedPhotoUrls(photos, signedUrlByPath);
}

async function hydrateSignedAlbumCoverUrls(sb, albums = []) {
    const paths = [...new Set(
        albums
            .map((album) => getPhotoStoragePath({ url: album.cover_url }))
            .filter(Boolean)
    )];
    if (!paths.length) return albums;

    const { data, error } = await sb.storage
        .from('photos')
        .createSignedUrls(paths, 900);
    if (error) return albums;

    const signedUrlByPath = new Map(
        (data || [])
            .filter((item) => item?.path && item?.signedUrl)
            .map((item) => [item.path, item.signedUrl])
    );
    return applySignedAlbumCoverUrls(albums, signedUrlByPath);
}

async function hydratePrivatePhotoLocations(sb, photos = []) {
    const photoIds = photos.map((photo) => photo.id).filter(Boolean);
    if (!photoIds.length) return photos;

    const { data, error } = await sb
        .from('photo_private_locations')
        .select('photo_id,lat,lng')
        .in('photo_id', photoIds);
    if (error || !data?.length) return photos;

    const locationsByPhotoId = new Map(data.map((location) => [location.photo_id, location]));
    return photos.map((photo) => {
        const privateLocation = locationsByPhotoId.get(photo.id);
        return privateLocation
            ? { ...photo, lat: privateLocation.lat, lng: privateLocation.lng }
            : photo;
    });
}

// ═══════════════════════════════════════════════════
//  1. 인증 (Auth) — 로그인/가입/로그아웃/세션
// ═══════════════════════════════════════════════════

export async function signUpWithEmail(email, password, options = {}) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: getSignUpAuthOptions(options)
        });
        if (error) throw error;
        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export async function signInWithEmail(email, password, options = {}) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password,
            options: getAuthOptions(options)
        });
        if (error) throw error;
        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        return { user: null, session: null, error };
    }
}

export async function resetPasswordForEmail(email, options = {}) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.resetPasswordForEmail(email, getAuthOptions(options));
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function updatePassword(password) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export async function signInWithOAuthProvider(provider) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithOAuth({
            provider,
            options: getOAuthProviderOptions(
                provider,
                window.location,
                window.navigator?.userAgent
            )
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function signInWithGoogle() {
    return signInWithOAuthProvider('google');
}

export async function signInWithKakao() {
    return signInWithOAuthProvider('kakao');
}

export async function signOut() {
    try {
        const sb = getSupabase();
        const { error } = await sb.auth.signOut();
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

export async function deleteCurrentAccount() {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.functions.invoke('delete-account', {
            body: { confirmation: 'DELETE_ACCOUNT' }
        });
        if (error || data?.deleted !== true) throw new Error('delete failed');
        await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
        return { error: null };
    } catch {
        return { error: new Error('계정을 삭제하지 못했어요.') };
    }
}

export async function getCurrentUser() {
    try {
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

export async function updateUserMetadata(metadata) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.updateUser({
            data: metadata
        });
        if (error) throw error;
        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

export async function updateNicknameInDB(userId, newNickname) {
    try {
        const sb = getSupabase();
        const { error } = await sb
            .from('profiles')
            .upsert({ id: userId, nickname: newNickname }, { onConflict: 'id' });
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

export async function updateProfileInDB(userId, profile = {}) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('profiles')
            .upsert({
                id: userId,
                nickname: profile.nickname,
                bio: profile.bio || '',
                avatar_url: profile.avatarUrl || ''
            }, { onConflict: 'id' })
            .select(PROFILE_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function fetchProfilesByIds(userIds) {
    try {
        const ids = [...new Set((userIds || []).filter(Boolean))];
        if (ids.length === 0) return { data: [], error: null };

        const sb = getSupabase();
        const { data, error } = await sb
            .from('profiles')
            .select(PROFILE_SELECT_COLUMNS)
            .in('id', ids);
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

// ═══════════════════════════════════════════════════
//  2. 데이터베이스 (DB) — 사진 CRUD + 댓글
// ═══════════════════════════════════════════════════

/**
 * 사진 목록 조회
 * RLS 정책이 자동으로 "누구나 SELECT 가능"을 보장하므로,
 * 프론트에서 owner_id 필터링을 추가로 수행
 */
export async function fetchPhotos({ hydrateUrls = true } = {}) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .select(PHOTO_SELECT_COLUMNS)
            .order('date', { ascending: false });
        if (error) throw error;
        const photosWithPrivateLocations = await hydratePrivatePhotoLocations(sb, data || []);
        if (!hydrateUrls) return { data: photosWithPrivateLocations, error: null };
        return { data: await hydrateSignedPhotoUrls(sb, photosWithPrivateLocations), error: null };
    } catch (error) {
        return { data: [], error };
    }
}

export async function hydratePhotoUrls(photos = []) {
    try {
        return { data: await hydrateSignedPhotoUrls(getSupabase(), photos), error: null };
    } catch (error) {
        return { data: photos, error };
    }
}

export async function fetchLandingCuration() {
    try {
        const sb = getSupabase();
        const [{ data: sections, error: sectionError }, { data: assignments, error: assignmentError }] = await Promise.all([
            sb.from('landing_sections').select(LANDING_SECTION_SELECT_COLUMNS).order('sort_order', { ascending: true }),
            sb.from('landing_section_photos').select(LANDING_SECTION_PHOTO_SELECT_COLUMNS).order('sort_order', { ascending: true })
        ]);
        if (sectionError) throw sectionError;
        if (assignmentError) throw assignmentError;
        return { sections: sections || [], assignments: assignments || [], error: null };
    } catch (error) {
        return { sections: [], assignments: [], error };
    }
}

export async function saveLandingSection(section, photoIds = []) {
    try {
        const sb = getSupabase();
        const payload = {
            id: section.id,
            title: String(section.title || '').trim(),
            description: String(section.description || '').trim(),
            sort_order: Number(section.sort_order || 0),
            is_visible: section.is_visible !== false,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await sb
            .from('landing_sections')
            .upsert(payload, { onConflict: 'id' })
            .select(LANDING_SECTION_SELECT_COLUMNS)
            .single();
        if (error) throw error;

        const { error: deleteError } = await sb
            .from('landing_section_photos')
            .delete()
            .eq('section_id', data.id);
        if (deleteError) throw deleteError;

        const assignments = [...new Set(photoIds.map(String).filter(Boolean))]
            .map((photoId, sortOrder) => ({ section_id: data.id, photo_id: photoId, sort_order: sortOrder }));
        if (assignments.length) {
            const { error: assignmentError } = await sb.from('landing_section_photos').insert(assignments);
            if (assignmentError) throw assignmentError;
        }
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function deleteLandingSection(sectionId) {
    try {
        const sb = getSupabase();
        const { error } = await sb.from('landing_sections').delete().eq('id', sectionId);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * 사진 추가 또는 수정 (UPSERT)
 * RLS 정책으로 본인 사진만 INSERT/UPDATE 가능
 */
export async function upsertPhoto(photo) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .upsert({
                id: photo.id.toString(),
                url: photo.url,
                storage_path: photo.storage_path || null,
                date: photo.date,
                description: photo.description || '',
                lat: photo.lat,
                lng: photo.lng,
                liked: Number(photo.liked || 0),
                shared: !!photo.shared,
                owner_id: photo.owner_id,
                album: photo.album || null,
                album_id: photo.album_id || null,
                visibility: photo.visibility || (photo.shared ? 'public' : 'private'),
                geo_source: photo.geo_source || 'unknown',
                location_precision: photo.location_precision || 'hidden'
            }, { onConflict: 'id' });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function requestPhotoAiAnalysis(photoId) {
    try {
        const sb = getSupabase();
        const { data: sessionData, error: sessionError } = await sb.auth.getSession();
        if (sessionError) throw sessionError;

        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error('로그인이 필요합니다.');

        const response = await fetch('/api/analyze-photo', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photoId: String(photoId) })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || '사진 AI 분석에 실패했습니다.');
            error.code = payload.error || 'analysis_failed';
            throw error;
        }
        return {
            data: payload.photo || null,
            analysis: payload.analysis || null,
            cached: Boolean(payload.cached),
            error: null
        };
    } catch (error) {
        return { data: null, analysis: null, cached: false, error };
    }
}

export async function updatePhotoLocation(photoId, lat, lng) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .update({
                lat,
                lng,
                geo_source: 'manual'
            })
            .eq('id', photoId.toString())
            .select(PHOTO_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function updatePhotoInfo(photoId, updates = {}) {
    try {
        const sb = getSupabase();
        const payload = {};
        if ('description' in updates) payload.description = updates.description || '';
        if ('date' in updates) payload.date = updates.date;
        if ('lat' in updates) payload.lat = updates.lat;
        if ('lng' in updates) payload.lng = updates.lng;
        if ('geo_source' in updates) payload.geo_source = updates.geo_source;
        if ('location_precision' in updates) payload.location_precision = updates.location_precision;
        if ('visibility' in updates) {
            payload.visibility = updates.visibility;
            payload.shared = updates.visibility === 'public';
        }

        const { data, error } = await sb
            .from('photos')
            .update(payload)
            .eq('id', photoId.toString())
            .select(PHOTO_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * 좋아요 행과 사진의 합계를 한 DB 트랜잭션에서 동기화합니다.
 */
export async function setPhotoLike(photoId, isLiking) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.rpc('set_photo_like', {
            target_photo_id: photoId.toString(),
            should_like: Boolean(isLiking)
        });
        if (error) throw error;
        return { likedCount: Number(data || 0), error: null };
    } catch (error) {
        return { likedCount: null, error };
    }
}

/**
 * 특정 유저가 좋아요한 사진 ID 목록 조회
 * 왜 필요: localStorage 대신 서버에서 좋아요 상태를 동기화하여
 * 다른 기기에서도 동일한 좋아요 상태를 유지하기 위함
 */
export async function fetchMyLikes(userId) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('user_likes')
            .select('photo_id')
            .eq('user_id', userId);
        if (error) throw error;
        return { data: (data || []).map(row => row.photo_id), error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/**
 * 사진 삭제
 * RLS 정책으로 본인 사진만 DELETE 가능
 * 관련 댓글은 ON DELETE CASCADE로 DB가 자동 삭제
 */
export async function deletePhoto(id, url, storagePath) {
    try {
        const sb = getSupabase();

        // Storage에서 업로드된 3가지 사이즈의 이미지를 모두 삭제 (실패해도 무시)
        try {
            const paths = [
                `${id}_micro.jpg`,
                `${id}_grid.jpg`,
                `${id}_detail.jpg`
            ];
            const uploadedPath = storagePath || getPhotoStoragePath({ url });
            if (uploadedPath) paths.push(uploadedPath);
            await sb.storage.from('photos').remove([...new Set(paths)]);
        } catch {}

        const { error } = await sb
            .from('photos')
            .delete()
            .eq('id', id.toString());
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * 특정 사진의 댓글 조회
 */
export async function fetchComments(photoId) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('comments')
            .select(COMMENT_SELECT_COLUMNS)
            .eq('photo_id', photoId.toString())
            .order('date', { ascending: false });
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/**
 * 댓글 작성
 * RLS 정책으로 로그인 유저만 INSERT 가능
 */
export async function postComment(photoId, text, authorId) {
    try {
        const sb = getSupabase();
        const { error } = await sb
            .from('comments')
            .insert({
                photo_id: photoId.toString(),
                text: text,
                date: new Date().toISOString(),
                author_id: authorId
            });
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

export async function fetchAlbums() {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('albums')
            .select(ALBUM_SELECT_COLUMNS)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data: await hydrateSignedAlbumCoverUrls(sb, data || []), error: null };
    } catch (error) {
        return { data: [], error };
    }
}

export async function createAlbum(album) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('albums')
            .insert({
                owner_id: album.owner_id,
                title: album.title,
                note: album.note || '',
                visibility: album.visibility || 'private',
                cover_url: album.cover_url || null,
                date_start: album.date_start || null,
                date_end: album.date_end || null,
                photo_count: Number(album.photo_count || 0)
            })
            .select(ALBUM_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function updateAlbum(albumId, album) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('albums')
            .update({
                title: album.title,
                note: album.note || '',
                visibility: album.visibility || 'private',
                cover_url: album.cover_url || null,
                photo_count: Number(album.photo_count || 0)
            })
            .eq('id', albumId)
            .select(ALBUM_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function deleteAlbum(albumId) {
    try {
        const sb = getSupabase();
        await sb
            .from('album_photos')
            .delete()
            .eq('album_id', albumId);
        await sb
            .from('photos')
            .update({ album_id: null, album: null })
            .eq('album_id', albumId);
        const { error } = await sb
            .from('albums')
            .delete()
            .eq('id', albumId);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

export async function attachPhotosToAlbum(albumId, photoIds) {
    try {
        const ids = [...new Set((photoIds || []).filter(Boolean))];
        if (!albumId || ids.length === 0) return { data: [], error: null };
        const sb = getSupabase();
        const rows = ids.map((photoId, index) => ({
            album_id: albumId,
            photo_id: photoId.toString(),
            sort_order: index
        }));
        const { data, error } = await sb
            .from('album_photos')
            .upsert(rows, { onConflict: 'album_id,photo_id' })
            .select(ALBUM_PHOTO_SELECT_COLUMNS);
        if (error) throw error;
        await sb
            .from('photos')
            .update({ album_id: albumId })
            .in('id', ids.map((id) => id.toString()));
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

export async function replaceAlbumPhotos(albumId, photoIds) {
    try {
        const sb = getSupabase();
        const ids = [...new Set((photoIds || []).filter(Boolean).map((id) => id.toString()))];
        await sb
            .from('album_photos')
            .delete()
            .eq('album_id', albumId);
        await sb
            .from('photos')
            .update({ album_id: null, album: null })
            .eq('album_id', albumId);
        return attachPhotosToAlbum(albumId, ids);
    } catch (error) {
        return { data: [], error };
    }
}

export async function detachPhotosFromAlbum(photoIds) {
    try {
        const ids = [...new Set((photoIds || []).filter(Boolean).map((id) => id.toString()))];
        if (ids.length === 0) return { data: [], error: null };
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .update({ album_id: null, album: null })
            .in('id', ids)
            .select(PHOTO_SELECT_COLUMNS);
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

export async function updateAlbumVisibility(albumId, visibility) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('albums')
            .update({ visibility })
            .eq('id', albumId)
            .select(ALBUM_SELECT_COLUMNS)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function updatePhotosVisibility(photoIds, visibility, locationPrecision) {
    try {
        const ids = [...new Set((photoIds || []).filter(Boolean).map((id) => id.toString()))];
        if (ids.length === 0) return { data: [], error: null };
        const sb = getSupabase();
        const payload = {
            visibility,
            shared: visibility === 'public'
        };
        if (locationPrecision) payload.location_precision = locationPrecision;

        const { data, error } = await sb
            .from('photos')
            .update(payload)
            .in('id', ids)
            .select(PHOTO_SELECT_COLUMNS);
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

// ═══════════════════════════════════════════════════
//  3. 파일 저장소 (Storage) — 이미지 업로드
// ═══════════════════════════════════════════════════

export async function removeUploadedImage(storagePath) {
    if (!storagePath) return { error: null };
    try {
        const sb = getSupabase();
        const { error } = await sb.storage
            .from('photos')
            .remove([storagePath]);
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

/**
 * 이미지를 Supabase Storage에 업로드하고 짧게 유효한 표시 URL을 반환
 * 왜 별도 함수: 업로드(Storage) → DB 저장(upsertPhoto) 2단계로 분리
 */
export async function uploadImage(file, fileName) {
    let uploadedPath = null;
    try {
        const sb = getSupabase();
        
        const { error } = await sb.storage
            .from('photos')
            .upload(fileName, file, getStorageUploadOptions(file));
        if (error) throw error;
        uploadedPath = fileName;

        const { data: signedUrlData, error: signedUrlError } = await sb.storage
            .from('photos')
            .createSignedUrl(fileName, 900);
        if (signedUrlError) throw signedUrlError;

        return { url: signedUrlData.signedUrl, storagePath: fileName, error: null };
    } catch (error) {
        if (uploadedPath) await removeUploadedImage(uploadedPath);
        return { url: null, storagePath: null, error };
    }
}

/**
 * Base64 데이터 URL을 File 객체로 변환하는 유틸리티
 * 왜 필요: 브라우저의 FileReader가 만든 data:image/... 문자열을
 * Supabase Storage가 받을 수 있는 Blob/File 형태로 바꿔야 함
 */
export function dataUrlToFile(dataUrl, fileName) {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
}
