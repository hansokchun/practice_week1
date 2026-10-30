import { retireGoogleAnalytics, isAnalyticsEntry, getCloudflareAnalyticsOptions, loadCloudflareAnalytics } from './analytics.mjs';
import { bindVisibleTimeMeasurement } from './site-activity.mjs';

function initializeAnalytics() {
    let storage;
    try { storage = window.localStorage; } catch {}
    retireGoogleAnalytics({ document, hostname: window.location.hostname, storage });
    if (document.documentElement.classList.contains('native-app')
        || window.location.protocol !== 'https:'
        || !['ikkyee.com', 'www.ikkyee.com'].includes(window.location.hostname)) return;

    // Measure one public document entry, never private screens or every hash navigation.
    let observedEntry = false;
    const observer = new MutationObserver(measureEntry);
    function measureEntry() {
        if (observedEntry || document.body.classList.contains('is-app-booting')) return;
        observedEntry = true;
        observer.disconnect();
        const page = document.body.dataset.page;
        if (!isAnalyticsEntry({ location: window.location, page })) return;
        void fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
            .then(response => response.ok ? response.json() : null)
            .then(config => {
                // A navigation during config loading must not start collection on a private screen.
                if (document.body.dataset.page !== page) return;
                const options = getCloudflareAnalyticsOptions({ location: window.location, page, token: config?.cloudflareAnalyticsToken });
                if (options) {
                    loadCloudflareAnalytics(document, options);
                    if (config.siteActivityEnabled === true) bindVisibleTimeMeasurement({ document, window });
                }
            })
            .catch(() => {});
    }
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-page', 'class'] });
    measureEntry();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAnalytics, { once: true });
else initializeAnalytics();
