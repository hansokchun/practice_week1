/**
 * auth.js — Supabase 올인원 모듈
 * 인증(Auth) + 데이터베이스(DB) + 파일저장소(Storage) 헬퍼를 한 곳에서 관리
 * 
 * 왜 한 파일에 모았나:
 * Supabase 클라이언트 인스턴스를 싱글톤으로 유지하고,
 * 모든 페이지(index.html, login.html)에서 동일한 설정으로 재사용하기 위함.
 */

const SUPABASE_URL = 'https://pqczcponriukilrtpbdl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m158oMsJtKHn2sUD3m7x-w_Rs6swjl8';

let _supabaseClient = null;

function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof supabase === 'undefined' || !supabase.createClient) {
        throw new Error('Supabase SDK 로드 실패. <script> 태그 확인 필요.');
    }
    _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabaseClient;
}

// ═══════════════════════════════════════════════════
//  1. 인증 (Auth) — 로그인/가입/로그아웃/세션
// ═══════════════════════════════════════════════════

async function signUpWithEmail(email, password) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error };
    }
}

async function signInWithEmail(email, password) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        return { user: null, session: null, error };
    }
}

async function signInWithGoogle() {
    try {
        const sb = getSupabase();
        const { data, error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/index.html` }
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function signOut() {
    try {
        const sb = getSupabase();
        const { error } = await sb.auth.signOut();
        if (error) throw error;
        return { error: null };
    } catch (error) {
        return { error };
    }
}

async function getCurrentUser() {
    try {
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        return user;
    } catch {
        return null;
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
async function fetchPhotos() {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/**
 * 사진 추가 또는 수정 (UPSERT)
 * RLS 정책으로 본인 사진만 INSERT/UPDATE 가능
 */
async function upsertPhoto(photo) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('photos')
            .upsert({
                id: photo.id.toString(),
                url: photo.url,
                date: photo.date,
                title: photo.title || '',
                description: photo.description || '',
                lat: photo.lat,
                lng: photo.lng,
                liked: Number(photo.liked || 0),
                shared: !!photo.shared,
                owner_id: photo.owner_id
            }, { onConflict: 'id' });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * 사진 삭제
 * RLS 정책으로 본인 사진만 DELETE 가능
 * 관련 댓글은 ON DELETE CASCADE로 DB가 자동 삭제
 */
async function deletePhoto(id) {
    try {
        const sb = getSupabase();

        // Storage에서 이미지 파일도 같이 삭제 시도 (실패해도 무시)
        try { await sb.storage.from('photos').remove([`${id}.jpg`]); } catch {}

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
async function fetchComments(photoId) {
    try {
        const sb = getSupabase();
        const { data, error } = await sb
            .from('comments')
            .select('*')
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
async function postComment(photoId, text, authorId) {
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

// ═══════════════════════════════════════════════════
//  3. 파일 저장소 (Storage) — 이미지 업로드
// ═══════════════════════════════════════════════════

/**
 * 이미지를 Supabase Storage에 업로드하고 공개 URL을 반환
 * 왜 별도 함수: 업로드(Storage) → DB 저장(upsertPhoto) 2단계로 분리
 */
async function uploadImage(file, photoId) {
    try {
        const sb = getSupabase();
        const fileName = `${photoId}.jpg`;

        const { error } = await sb.storage
            .from('photos')
            .upload(fileName, file, {
                contentType: file.type || 'image/jpeg',
                upsert: true // 같은 이름이면 덮어쓰기
            });
        if (error) throw error;

        // 업로드 성공 시 퍼블릭 URL 생성
        const { data: urlData } = sb.storage
            .from('photos')
            .getPublicUrl(fileName);

        return { url: urlData.publicUrl, error: null };
    } catch (error) {
        return { url: null, error };
    }
}

/**
 * Base64 데이터 URL을 File 객체로 변환하는 유틸리티
 * 왜 필요: 브라우저의 FileReader가 만든 data:image/... 문자열을
 * Supabase Storage가 받을 수 있는 Blob/File 형태로 바꿔야 함
 */
function dataUrlToFile(dataUrl, fileName) {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
}
