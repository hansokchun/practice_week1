/**
 * auth.js — Supabase 인증 래핑 모듈
 * 앱 전체에서 재사용할 로그인, 토큰 관리, API 호출 헬퍼
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

// ─── 이메일/비밀번호 인증 ─────────────────────────────────

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

// ─── 소셜 로그인 (OAuth) ─────────────────────────────────

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

// ─── 세션 관리 ────────────────────────────────────────────

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

async function getAccessToken() {
    try {
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        return session?.access_token || null;
    } catch {
        return null;
    }
}

function onAuthStateChange(callback) {
    const sb = getSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange(callback);
    return subscription;
}

// ─── 유틸리티 ─────────────────────────────────────────────

async function authFetch(url, options = {}) {
    const token = await getAccessToken();
    const headers = { ...options.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}
