/**
 * app.js — Travelgram 앱 진입점
 * 
 * 각 모듈을 초기화하고 의존성을 주입하는 오케스트레이터
 * 순환 참조를 방지하기 위해 모듈 간 함수는 이 파일에서 연결
 */
import { getCurrentUser } from '../auth.js';
import { createState, createUI } from './state.js';
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

    // 2. 지도 초기화
    const { map, clusterGroup } = initMap(state, ui);
    const ctx = { state, ui, map, clusterGroup };

    // 3. 모듈 초기화 — 순환 참조를 방지하기 위해 단계적으로 주입
    //    showDetail과 renderAll이 서로를 참조하므로 지연 바인딩 사용
    let showDetail, closeDetail, renderAll, showToast, syncData, openProfilePage, processFiles, startLocationPicker;

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
    const profileFns = initProfile(ctx, { showDetail, renderAll });
    openProfilePage = profileFns.openProfilePage;

    // upload 모듈
    const uploadFns = initUpload(ctx, { showToast, syncData });
    processFiles = uploadFns.processFiles;
    startLocationPicker = uploadFns.startLocationPicker;

    // auth-guard (프로필 팝업, 로그인 상태 UI)
    initAuthGuard({ state, ui, showToast, openProfilePage });

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
    syncData();
});
