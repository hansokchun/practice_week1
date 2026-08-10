const EMBEDDED_BROWSER_TOKENS = [
    'kakaotalk',
    'instagram',
    'fbav',
    'fban',
    'line/',
    'naver(inapp',
    'daumapps',
    '; wv)'
];

export function isLikelyEmbeddedOAuthBrowser(userAgent = '') {
    const normalized = String(userAgent || '').toLowerCase();
    if (!normalized) return false;
    if (EMBEDDED_BROWSER_TOKENS.some((token) => normalized.includes(token))) return true;

    const isIOS = /iphone|ipad|ipod/.test(normalized);
    const hasSafari = normalized.includes('safari');
    const knownIOSBrowser = normalized.includes('crios')
        || normalized.includes('fxios')
        || normalized.includes('edgios');

    return isIOS && !hasSafari && !knownIOSBrowser;
}

export function getEmbeddedOAuthBrowserMessage(provider = 'google') {
    const providerName = provider === 'google' ? 'Google' : provider === 'kakao' ? 'Kakao' : '소셜';
    return `${providerName} 로그인은 일부 앱 내부 브라우저에서 차단될 수 있습니다. Safari 또는 Chrome으로 열어서 다시 시도해주세요.`;
}
