/**
 * login.js — §9 로그인/회원가입 모달 로직
 */
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../auth.js';

export function initLogin() {
    const loginModal = document.getElementById('login-modal-overlay');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const btnSubmit = document.getElementById('btn-submit');
    const btnGoogle = document.getElementById('btn-google');
    const messageEl = document.getElementById('auth-message');
    const btnLoginSidebar = document.getElementById('btn-login-sidebar');

    let isLoginMode = true;

    // 사이드바 로그인 버튼 → 모달 열기
    if (btnLoginSidebar && loginModal) {
        btnLoginSidebar.onclick = () => {
            loginModal.classList.remove('hidden');
            requestAnimationFrame(() => loginModal.classList.add('active'));
        };
    }

    function hideLoginModal() {
        if (!loginModal) return;
        loginModal.classList.remove('active');
        setTimeout(() => loginModal.classList.add('hidden'), 300);
    }

    if (btnCloseLogin && loginModal) {
        btnCloseLogin.onclick = hideLoginModal;
        loginModal.addEventListener('click', (e) => { if (e.target === loginModal) hideLoginModal(); });
    }

    function showAuthMessage(text, type = 'error') {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = `auth-message visible ${type}`;
        setTimeout(() => messageEl.classList.remove('visible'), 5000);
    }

    function setAuthLoading(loading) {
        if (!btnSubmit || !btnGoogle) return;
        btnSubmit.disabled = loading;
        btnGoogle.disabled = loading;
        btnSubmit.innerHTML = loading ? `<span class="spinner"></span>처리 중...` : (isLoginMode ? '로그인' : '회원가입');
    }

    if (tabLogin && tabSignup && passwordInput && messageEl && btnSubmit) {
        tabLogin.onclick = () => {
            isLoginMode = true;
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            btnSubmit.textContent = '로그인';
            passwordInput.autocomplete = 'current-password';
            messageEl.classList.remove('visible');
        };
        tabSignup.onclick = () => {
            isLoginMode = false;
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            btnSubmit.textContent = '회원가입';
            passwordInput.autocomplete = 'new-password';
            messageEl.classList.remove('visible');
        };
    }

    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !password) return showAuthMessage('이메일과 비밀번호를 모두 입력해주세요.');
            if (password.length < 6) return showAuthMessage('비밀번호는 6자 이상이어야 합니다.');

            setAuthLoading(true);
            if (isLoginMode) {
                const { user, error } = await signInWithEmail(email, password);
                if (error) showAuthMessage(error.message.includes('Invalid login') ? '이메일 또는 비밀번호가 올바르지 않습니다.' : error.message);
                else { showAuthMessage('로그인 성공! 이동 중...', 'success'); setTimeout(() => window.location.reload(), 800); }
            } else {
                const { user, error } = await signUpWithEmail(email, password);
                if (error) showAuthMessage(error.message.includes('already registered') ? '이미 가입된 이메일입니다.' : error.message);
                else { showAuthMessage('회원가입 완료! 이메일 인증 후 로그인해주세요.', 'success'); if (tabLogin) tabLogin.click(); }
            }
            setAuthLoading(false);
        };
    }

    if (btnGoogle) {
        btnGoogle.onclick = async () => {
            setAuthLoading(true);
            const { error } = await signInWithGoogle();
            if (error) { showAuthMessage('구글 로그인에 실패했습니다. 다시 시도해주세요.'); setAuthLoading(false); }
        };
    }
}
