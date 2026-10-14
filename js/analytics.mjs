export function retireGoogleAnalytics({ document, hostname = '', storage }) {
    try { storage?.removeItem('ikkyee:analytics-consent:v1'); } catch {}
    try {
        const names = document.cookie.split(';').map(cookie => cookie.trim().split('=')[0])
            .filter(name => name === '_ga' || /^_ga_[A-Z0-9]+$/i.test(name));
        const domains = ['', hostname, `.${hostname}`, '.ikkyee.com'];
        for (const name of names) for (const domain of new Set(domains)) {
            document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
        }
    } catch { /* Restricted storage must not interrupt login or photo loading. */ }
}

export function isAnalyticsEntry({ location, page, native = false }) {
    return !native && location?.protocol === 'https:'
        && ['ikkyee.com', 'www.ikkyee.com'].includes(location.hostname)
        && ['landing', 'home', 'explore', 'tag'].includes(page);
}

export function getCloudflareAnalyticsOptions({ location, page, native = false, token }) {
    if (!isAnalyticsEntry({ location, page, native }) || !/^[a-f0-9]{32}$/.test(token || '')) return null;
    return { token, spa: false };
}

export function loadCloudflareAnalytics(document, options) {
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = JSON.stringify(options);
    script.onerror = () => script.remove();
    document.head.append(script);
}
