import { ANALYTICS_CONSENT_KEY, createAnalyticsController, loadAnalyticsConsent } from './analytics.mjs';

function initializeAnalytics() {
    let storage;
    try { storage = window.localStorage; } catch {}
    const analytics = createAnalyticsController({ window, document, storage });
    const dialog = document.getElementById('analytics-preferences');
    const banner = document.getElementById('analytics-consent-banner');
    const toggle = document.getElementById('settings-analytics-consent');
    const status = document.getElementById('analytics-preferences-status');
    const sync = () => {
        banner.hidden = !analytics.available || analytics.consent !== null;
        if (toggle) { toggle.disabled = !analytics.available; toggle.checked = analytics.consent === 'granted'; }
        const message = !analytics.available ? '방문 통계는 아직 사용하지 않습니다.'
            : analytics.consent === 'granted' ? '이 브라우저에서 방문 통계를 허용했습니다.'
                : '동의하지 않아도 모든 서비스를 이용할 수 있습니다.';
        status.textContent = message;
        const settingsStatus = document.getElementById('settings-analytics-status');
        if (settingsStatus) settingsStatus.textContent = message;
        dialog.querySelector('[data-analytics-choice="granted"]').disabled = !analytics.available;
    };
    const choose = choice => {
        const mustReload = choice !== 'granted' && analytics.tagRequested;
        void analytics.choose(choice);
        sync();
        dialog.close();
        // A fresh document also removes the already-loaded third-party tag after withdrawal.
        if (mustReload) window.location.reload();
    };
    document.querySelectorAll('[data-analytics-open]').forEach(button => button.addEventListener('click', () => { sync(); dialog.showModal(); }));
    document.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => choose(button.dataset.analyticsChoice)));
    document.querySelector('[data-analytics-close]').addEventListener('click', () => dialog.close());
    toggle?.addEventListener('change', () => choose(toggle.checked ? 'granted' : 'denied'));
    const measurePage = () => analytics.page(document.body.classList.contains('is-app-booting') ? null : document.body.dataset.page);
    const observer = new MutationObserver(() => { void measurePage(); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-page', 'class'] });
    void measurePage();
    window.addEventListener('storage', event => {
        if (event.key !== ANALYTICS_CONSENT_KEY && event.key !== null) return;
        const choice = loadAnalyticsConsent(storage);
        const mustReload = choice !== 'granted' && analytics.tagRequested;
        void analytics.choose(choice, { persist: false });
        sync();
        if (mustReload) window.location.reload();
    });
    sync();
    // Runtime config is optional and must never delay photo loading or authentication.
    void fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
        .then(response => response.ok ? response.json() : null)
        .then(config => analytics.configure(config?.googleAnalyticsMeasurementId))
        .catch(() => {})
        .finally(sync);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAnalytics, { once: true });
else initializeAnalytics();
