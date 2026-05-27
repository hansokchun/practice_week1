/**
 * app.js — Travelgram 앱 진입점
 * 
 * 각 모듈을 초기화하고 의존성을 주입하는 오케스트레이터
 * 순환 참조를 방지하기 위해 모듈 간 함수는 이 파일에서 연결
 */
import { fetchProfilesByIds, getCurrentUser } from '../auth.js';
import { createState, createUI, loadPageState } from './state.js';
import { APP_SECTIONS, parseSectionHash } from './app-sections.mjs';
import { createProfileNameResolver } from './profile-names.mjs';
import { initAuthGuard } from './auth-guard.js';
import { initMap } from './map.js';
import { initRender } from './render.js';
import { initDetail } from './detail.js';
import { initProfile } from './profile.js';
import { initUpload } from './upload.js';
import { initEvents } from './events.js';
import { initMobile } from './mobile.js';
import { initLogin } from './login.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 현재 유저 확인 및 핵심 객체 생성
    const currentUser = await getCurrentUser();
    const state = createState(currentUser);
    const ui = createUI();
    const profileNameResolver = createProfileNameResolver({
        fetchProfilesByIds: async (ids) => {
            const { data, error } = await fetchProfilesByIds(ids);
            if (error) throw error;
            return data;
        }
    });
    if (currentUser?.user_metadata?.nickname) {
        profileNameResolver.prime(currentUser.id, currentUser.user_metadata.nickname);
    }

    // 2. 지도 초기화
    const { map, clusterGroup } = initMap(state, ui);
    const ctx = { state, ui, map, clusterGroup, profileNameResolver };

    // 3. 모듈 초기화 — 순환 참조를 방지하기 위해 단계적으로 주입
    //    showDetail과 renderAll이 서로를 참조하므로 지연 바인딩 사용
    let showDetail, closeDetail, renderAll, showToast, syncData, openProfilePage, restoreProfileGallery, processFiles, startLocationPicker;

    // render 모듈: showDetail을 나중에 바인딩
    const renderFns = initRender(ctx, {
        showDetail: (p) => showDetail(p)
    });
    showToast = renderFns.showToast;
    syncData = renderFns.syncData;
    renderAll = renderFns.renderAll;

    // detail 모듈
    const detailFns = initDetail(ctx, {
        renderAll,
        showToast,
        syncData,
        openProfilePage: (...args) => openProfilePage(...args)
    });
    showDetail = detailFns.showDetail;
    closeDetail = detailFns.closeDetail;

    // profile 모듈
    const profileFns = initProfile(ctx, { showDetail, renderAll, showToast, syncData });
    openProfilePage = profileFns.openProfilePage;
    restoreProfileGallery = profileFns.restoreProfileGallery;

    // upload 모듈
    const uploadFns = initUpload(ctx, { showToast, syncData });
    processFiles = uploadFns.processFiles;
    startLocationPicker = uploadFns.startLocationPicker;

    // auth-guard (프로필 팝업, 로그인 상태 UI)
    initAuthGuard({ state, ui, showToast, openProfilePage, profileNameResolver });

    // events 모듈 (모든 이벤트 핸들러 바인딩)
    initEvents(ctx, {
        renderAll, showDetail, closeDetail, showToast, syncData,
        processFiles, startLocationPicker
    });

    // mobile 드래그
    initMobile(ctx);

    // login 모달
    initLogin();

    // 4. 첫 데이터 로드
    await syncData();

    // 5. 새로고침 시 이전 페이지 복원 (sessionStorage 우선, URL 해시 폴백)
    // 왜 syncData 이후: 사진 데이터가 로드된 상태여야 상세/프로필 페이지를 열 수 있음
    const routeSectionAfterLoad = parseSectionHash(window.location.hash);
    const saved = loadPageState();
    const legacyHashId = !routeSectionAfterLoad && window.location.hash
        ? window.location.hash.slice(1)
        : '';
    const linkedPhoto = legacyHashId && !legacyHashId.startsWith('/')
        ? state.photos.find(p => p.id == legacyHashId)
          || state.sharedPhotos.find(p => p.id == legacyHashId)
        : null;

    if (linkedPhoto) {
        showDetail(linkedPhoto);
        return;
    }

    const restoredSection = routeSectionAfterLoad || saved?.appSection || APP_SECTIONS.HOME;
    if (state.openSection) state.openSection(restoredSection, { skipHash: !!routeSectionAfterLoad });

    if (!routeSectionAfterLoad && saved && saved.viewMode) {
        if (saved.viewMode === 'user' && saved.targetUserId) {
            // 프로필 페이지 복원
            const nickname = saved.targetNickname || 'User';
            openProfilePage(saved.targetUserId, nickname);

            if (saved.profileViewMode || saved.activeAlbum) {
                restoreProfileGallery({
                    profileViewMode: saved.profileViewMode,
                    activeAlbum: saved.activeAlbum
                });
            }
        }

        if (saved.currentPhotoId && restoredSection !== APP_SECTIONS.HOME) {
            // 사진 상세 페이지 복원
            const photo = state.photos.find(p => String(p.id) === String(saved.currentPhotoId))
                       || state.sharedPhotos.find(p => String(p.id) === String(saved.currentPhotoId));
            if (photo) showDetail(photo);
        }
    }
});
