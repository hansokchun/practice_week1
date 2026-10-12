export const ANALYTICS_CONSENT_KEY = 'ikkyee:analytics-consent:v1';
const PAGES = Object.freeze({
    landing: ['/welcome', '랜딩'], home: ['/main', '메인'], explore: ['/map', '지도'],
    tag: ['/topics', '주제 사진'], trip: ['/album', '앨범 보기'], profile: ['/profile', '프로필'],
    photos: ['/photos', '사진 목록'], liked: ['/favorites', '좋아요 사진']
});

export function normalizeAnalyticsId(value) {
    const id = typeof value === 'string' ? value.trim() : '';
    return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : '';
}

export function getAnalyticsPage(route) {
    const page = Object.hasOwn(PAGES, route) ? PAGES[route] : null;
    return page ? { page_location: `https://ikkyee.com${page[0]}`, page_title: page[1], page_path: page[0] } : null;
}

export function getAnalyticsReferrer(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !['ikkyee.com', 'www.ikkyee.com'].includes(url.hostname)
            ? `${url.origin}/` : '';
    } catch { return ''; }
}

export function loadAnalyticsConsent(storage) {
    try {
        const value = JSON.parse(storage?.getItem(ANALYTICS_CONSENT_KEY) || 'null');
        return value?.version === 1 && ['granted', 'denied'].includes(value.choice) ? value.choice : null;
    } catch { return null; }
}

function clearAnalyticsCookies(document, hostname) {
    try {
        const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0])
            .filter(name => name === '_ga' || /^_ga_[A-Z0-9]+$/i.test(name));
        const domains = ['', hostname, `.${hostname}`, '.ikkyee.com'];
        for (const name of names) for (const domain of new Set(domains)) {
            document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
        }
    } catch { /* Cookie restrictions must not block consent withdrawal. */ }
}

export function loadAnalyticsScript(document, measurementId) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = true;
        script.referrerPolicy = 'no-referrer';
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        const timeout = setTimeout(() => fail(), 15000);
        function fail() {
            clearTimeout(timeout);
            script.remove();
            reject(new Error('Analytics unavailable'));
        }
        script.onload = () => { clearTimeout(timeout); resolve(); };
        script.onerror = fail;
        document.head.append(script);
    });
}

export function createAnalyticsController({ window, document, storage, loadScript = id => loadAnalyticsScript(document, id) }) {
    let id = '', consent = loadAnalyticsConsent(storage), page = null;
    let initialized = false, loading = null, loaded = false, lastPage = '';
    let previous = getAnalyticsReferrer(document.referrer);
    const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
    const eligible = () => window.location.protocol === 'https:' && ['ikkyee.com', 'www.ikkyee.com'].includes(window.location.hostname);
    function command() { window.dataLayer.push(arguments); }

    async function measure() {
        const enabled = Boolean(id && eligible() && consent === 'granted' && page);
        if (id) window[`ga-disable-${id}`] = !enabled;
        if (!enabled) {
            lastPage = '';
            if (initialized) command('set', { page_location: 'https://ikkyee.com/unmeasured', page_title: '비측정 화면', page_referrer: '' });
            return;
        }
        if (!initialized) {
            window.dataLayer = window.dataLayer || [];
            command('consent', 'default', denied);
            command('consent', 'update', { ...denied, analytics_storage: 'granted' });
            command('js', new Date());
            command('config', id, {
                send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
                cookie_domain: window.location.hostname, cookie_expires: 28 * 24 * 60 * 60,
                cookie_update: false, cookie_flags: 'SameSite=Lax;Secure',
                ...page, page_referrer: previous
            });
            initialized = true;
        }
        try {
            if (!loaded) {
                loading ||= Promise.resolve().then(() => loadScript(id)).then(() => { loaded = true; }).finally(() => { loading = null; });
                await loading;
            }
        } catch { return; }
        if (consent !== 'granted' || !page || !eligible() || window[`ga-disable-${id}`] || lastPage === page.page_path) return;
        command('set', { ...page, page_referrer: previous });
        command('event', 'page_view', { ...page, page_referrer: previous, send_to: id });
        previous = page.page_location;
        lastPage = page.page_path;
    }

    return {
        get available() { return Boolean(id && eligible()); },
        get consent() { return consent; },
        get tagRequested() { return initialized; },
        async configure(value) { id = normalizeAnalyticsId(value); await measure(); },
        async page(route) { page = getAnalyticsPage(route); await measure(); },
        async choose(choice, { persist = true } = {}) {
            consent = choice === 'granted' ? 'granted' : 'denied';
            if (persist) try { storage?.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ version: 1, choice: consent })); } catch {}
            if (consent === 'denied') clearAnalyticsCookies(document, window.location.hostname);
            await measure();
        }
    };
}
