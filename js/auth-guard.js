/**
 * auth-guard.js — §1 인증 상태 확인 및 프로필 팝업 관리
 * 왜 분리: 인증 관련 UI 로직이 독립적이고 길어서 별도 관리가 효율적
 */
import {
    getCurrentUser, signOut, updateUserMetadata, updateNicknameInDB, uploadImage
} from '../auth.js';

/**
 * 인증 상태에 따른 UI 초기화 및 프로필 팝업 이벤트 바인딩
 * @param {Object} params - { state, ui, showToast, openProfilePage }
 */
export function initAuthGuard({ state, ui, showToast, openProfilePage }) {
    const currentUser = state.currentUser;
    const splash = document.getElementById('splash-screen');
    
    // Get Started 버튼 → 스플래시 화면 숨김
    if (splash) {
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.onclick = () => { splash.style.display = 'none'; };
        }
    }

    const userMenu = document.getElementById('user-menu');
    const userAvatar = document.getElementById('user-avatar');
    const btnLoginSidebar = document.getElementById('btn-login-sidebar');
    const btnPostLabel = document.getElementById('btn-post-label');
    
    if (!currentUser) {
        if (btnLoginSidebar) btnLoginSidebar.style.display = 'inline-block';
        if (btnPostLabel) btnPostLabel.style.display = 'none';
        if (userMenu) userMenu.style.display = 'none';
    } else {
        if (splash) splash.style.display = 'none';
        if (btnLoginSidebar) btnLoginSidebar.style.display = 'none';
    }

    const btnLogout = document.getElementById('btn-logout');
    const profilePopup = document.getElementById('profile-popup');
    
    if (userMenu && userAvatar && currentUser && currentUser.email) {
        userMenu.style.display = 'flex';
        const userInitial = currentUser.email.substring(0, 2).toUpperCase();
        userAvatar.textContent = userInitial;
        
        const profileEmail = document.getElementById('profile-email');
        const profileId = document.getElementById('profile-id');
        const profileNickname = document.getElementById('profile-nickname');
        const profileEmailSub = document.getElementById('profile-email-sub');
        const profileAvatarLg = document.getElementById('profile-popup-avatar');
        
        const profileMainView = document.getElementById('profile-main-view');
        const profileDetailView = document.getElementById('profile-detail-view');
        const btnViewInfo = document.getElementById('btn-view-info');
        const btnViewMyProfile = document.getElementById('btn-view-my-profile');
        const btnBackProfile = document.getElementById('btn-back-profile');
        
        const demoDisplay = document.getElementById('demo-display');
        const demoEdit = document.getElementById('demo-edit');
        const demoEmail = document.getElementById('demo-email');
        const demoAge = document.getElementById('demo-age');
        const demoGender = document.getElementById('demo-gender');
        const inputNickname = document.getElementById('input-nickname');
        const inputAge = document.getElementById('input-age');
        const inputGender = document.getElementById('input-gender');
        const btnEditDemo = document.getElementById('btn-edit-demo');
        const btnSaveDemo = document.getElementById('btn-save-demo');
        const btnCancelDemo = document.getElementById('btn-cancel-demo');
        const editAvatarPreview = document.getElementById('edit-avatar-preview');
        const inputAvatarFile = document.getElementById('input-avatar-file');
        let selectedAvatarFile = null;

        let nickname = currentUser.user_metadata?.nickname || '';
        let age = currentUser.user_metadata?.age || '';
        let gender = currentUser.user_metadata?.gender || '';
        let avatarUrl = currentUser.user_metadata?.avatar_url || null;

        const renderProfileUI = () => {
            if (avatarUrl) {
                const imgHtml = `<img src="${avatarUrl}" alt="avatar">`;
                if (profileAvatarLg) profileAvatarLg.innerHTML = imgHtml;
                if (userAvatar) userAvatar.innerHTML = imgHtml;
            } else {
                if (profileAvatarLg) profileAvatarLg.innerHTML = userInitial;
                if (userAvatar) userAvatar.innerHTML = userInitial;
            }
            if (profileNickname) profileNickname.textContent = nickname || currentUser.email;
            if (profileEmailSub) profileEmailSub.textContent = nickname ? currentUser.email : `ID: ${currentUser.id.substring(0, 8)}`;
            
            if (demoEmail) demoEmail.textContent = currentUser.email;
            
            if (age) { 
                const ageLabel = inputAge ? Array.from(inputAge.options).find(o => o.value === age)?.text || age : age;
                if (demoAge) { demoAge.textContent = ageLabel; demoAge.style.color = 'var(--text-main)'; }
            } else { 
                if (demoAge) { demoAge.textContent = '미입력'; demoAge.style.color = 'var(--text-muted)'; }
            }
            
            if (gender) { 
                const genderLabel = inputGender ? Array.from(inputGender.options).find(o => o.value === gender)?.text || gender : gender;
                if (demoGender) { demoGender.textContent = genderLabel; demoGender.style.color = 'var(--text-main)'; }
            } else { 
                if (demoGender) { demoGender.textContent = '미입력'; demoGender.style.color = 'var(--text-muted)'; }
            }
            
            if (demoDisplay && demoEdit) {
                demoDisplay.classList.remove('hidden');
                demoEdit.classList.add('hidden');
            }
        };
        renderProfileUI();

        if (btnViewMyProfile) {
            btnViewMyProfile.onclick = (e) => {
                e.stopPropagation();
                if (profilePopup) profilePopup.classList.add('hidden');
                openProfilePage(currentUser.id, nickname || currentUser.email.split('@')[0] || '나');
            };
        }

        if (btnViewInfo) {
            btnViewInfo.onclick = (e) => {
                e.stopPropagation();
                if (profileMainView) profileMainView.classList.add('hidden');
                if (profileDetailView) profileDetailView.classList.remove('hidden');
                renderProfileUI();
            };
        }

        if (btnBackProfile) {
            btnBackProfile.onclick = (e) => {
                e.stopPropagation();
                if (profileDetailView) profileDetailView.classList.add('hidden');
                if (profileMainView) profileMainView.classList.remove('hidden');
            };
        }

        if (btnEditDemo) {
            btnEditDemo.onclick = (e) => {
                e.stopPropagation();
                if (demoDisplay) demoDisplay.classList.add('hidden');
                if (demoEdit) demoEdit.classList.remove('hidden');
                if (inputNickname) inputNickname.value = nickname;
                if (inputAge) inputAge.value = age;
                if (inputGender) inputGender.value = gender;
                
                selectedAvatarFile = null;
                if (editAvatarPreview) {
                    if (avatarUrl) {
                        editAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
                    } else {
                        editAvatarPreview.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">클릭하여 변경</span>`;
                    }
                }
            };
        }

        if (editAvatarPreview && inputAvatarFile) {
            editAvatarPreview.onclick = (e) => { e.stopPropagation(); inputAvatarFile.click(); };
            inputAvatarFile.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    selectedAvatarFile = file;
                    const reader = new FileReader();
                    reader.onload = (re) => { editAvatarPreview.innerHTML = `<img src="${re.target.result}" alt="preview">`; };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (btnCancelDemo) {
            btnCancelDemo.onclick = (e) => { e.stopPropagation(); renderProfileUI(); };
        }

        if (btnSaveDemo) {
            btnSaveDemo.onclick = async (e) => {
                e.stopPropagation();
                const newNickname = inputNickname ? inputNickname.value.trim() : '';
                const newAge = inputAge ? inputAge.value : '';
                const newGender = inputGender ? inputGender.value : '';
                
                const originalText = btnSaveDemo.textContent;
                btnSaveDemo.textContent = '...';
                btnSaveDemo.disabled = true;

                let newAvatarUrl = avatarUrl;
                if (selectedAvatarFile) {
                    const ext = selectedAvatarFile.name.split('.').pop();
                    const fileName = `avatars/${currentUser.id}_${Date.now()}.${ext}`;
                    const { url, error: uploadErr } = await uploadImage(selectedAvatarFile, fileName);
                    if (!uploadErr && url) newAvatarUrl = url;
                    else console.error("Avatar upload failed:", uploadErr);
                }

                if (newNickname !== nickname) {
                    const { error: dbError } = await updateNicknameInDB(currentUser.id, newNickname);
                    if (dbError) {
                        btnSaveDemo.textContent = originalText;
                        btnSaveDemo.disabled = false;
                        if (dbError.code === '23505') {
                            showToast("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.", "warning");
                        } else {
                            showToast("닉네임 변경 중 오류가 발생했습니다.", "warning");
                        }
                        return;
                    }
                }

                const { user, error } = await updateUserMetadata({ 
                    nickname: newNickname, age: newAge, gender: newGender, avatar_url: newAvatarUrl
                });
                
                btnSaveDemo.textContent = originalText;
                btnSaveDemo.disabled = false;

                if (!error) {
                    currentUser.user_metadata = user.user_metadata;
                    nickname = newNickname;
                    age = newAge;
                    gender = newGender;
                    avatarUrl = newAvatarUrl;
                    renderProfileUI();
                }
            };
        }
        
        if (profilePopup) {
            profilePopup.onclick = (e) => e.stopPropagation();
        }
        
        userAvatar.style.cursor = 'pointer';
        userAvatar.onclick = (e) => {
            e.stopPropagation();
            if (profilePopup) {
                profilePopup.classList.toggle('hidden');
                if (!profilePopup.classList.contains('hidden')) {
                    const profileStoryCount = document.getElementById('profile-story-count');
                    const profileLikeCount = document.getElementById('profile-like-count');
                    const myStories = state.photos.filter(p => p.owner_id === currentUser.id).length;
                    const myLikes = state.myLikedIds.length;
                    if (profileStoryCount) profileStoryCount.textContent = myStories;
                    if (profileLikeCount) profileLikeCount.textContent = myLikes;
                }
            }
        };

        document.addEventListener('click', (e) => {
            if (profilePopup && !profilePopup.classList.contains('hidden') && !userMenu.contains(e.target)) {
                profilePopup.classList.add('hidden');
            }
        });
        
        if (btnLogout) {
            btnLogout.onclick = async () => { await signOut(); window.location.href = '/login.html'; };
        }
    }

    // btnLoginSidebar 참조를 반환하여 login 모듈에서 사용
    return { btnLoginSidebar };
}
