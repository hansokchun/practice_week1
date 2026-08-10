const KAKAO_SDK_ID = 'kakao-javascript-sdk';
const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js';
const KAKAO_SDK_INTEGRITY = 'sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J';

export const KAKAO_JAVASCRIPT_KEY = 'c9aeb54d262be3dc1d1ec2cd3ebd5c69';

let sdkPromise = null;

export function getKakaoSharePayload(url) {
    const shareUrl = String(url || '');
    return {
        objectType: 'feed',
        content: {
            title: 'Ikkyee 여행 앨범',
            description: '여행 사진과 장소를 지도에서 함께 둘러보세요.',
            imageUrl: 'https://practice-week1-cws.pages.dev/social-preview.jpg',
            link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl
            }
        },
        buttons: [{
            title: '앨범 보기',
            link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl
            }
        }]
    };
}

export function initializeKakaoShare(kakao, javascriptKey = KAKAO_JAVASCRIPT_KEY) {
    if (!kakao?.isInitialized?.()) kakao?.init?.(javascriptKey);
    return kakao;
}

export function loadKakaoShareSdk(documentObject = globalThis.document, windowObject = globalThis.window) {
    if (windowObject?.Kakao) return Promise.resolve(windowObject.Kakao);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
        const existing = documentObject?.getElementById?.(KAKAO_SDK_ID);
        const script = existing || documentObject?.createElement?.('script');
        if (!script) {
            reject(new Error('Kakao SDK를 불러올 수 없습니다.'));
            return;
        }

        script.addEventListener('load', () => {
            if (windowObject?.Kakao) resolve(windowObject.Kakao);
            else reject(new Error('Kakao SDK가 준비되지 않았습니다.'));
        }, { once: true });
        script.addEventListener('error', () => reject(new Error('Kakao SDK를 불러오지 못했습니다.')), { once: true });

        if (!existing) {
            script.id = KAKAO_SDK_ID;
            script.src = KAKAO_SDK_URL;
            script.integrity = KAKAO_SDK_INTEGRITY;
            script.crossOrigin = 'anonymous';
            documentObject.head.append(script);
        }
    }).catch((error) => {
        sdkPromise = null;
        throw error;
    });

    return sdkPromise;
}

export async function sendKakaoShare(kakao, url, javascriptKey = KAKAO_JAVASCRIPT_KEY) {
    initializeKakaoShare(kakao, javascriptKey);
    if (!kakao?.Share?.sendDefault) throw new Error('Kakao 공유 기능을 사용할 수 없습니다.');
    return kakao.Share.sendDefault(getKakaoSharePayload(url));
}
