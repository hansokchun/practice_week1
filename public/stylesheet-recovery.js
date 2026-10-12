(function () {
    var retried = new WeakSet();
    function appStylesheet(link) {
        if (!link || link.tagName !== 'LINK' || link.rel !== 'stylesheet') return null;
        try {
            var url = new URL(link.href, location.origin);
            return url.origin === location.origin && /^\/assets\/[^/]+\.css$/.test(url.pathname) ? url : null;
        } catch (_) { return null; }
    }
    function retry(link) {
        var url = appStylesheet(link);
        if (!url || retried.has(link) || url.searchParams.has('ikkyee-style-retry')) return;
        retried.add(link);
        url.searchParams.set('ikkyee-style-retry', String(Date.now()));
        link.href = url.href;
    }
    // Capture a cached HTML/MIME failure before the deferred application starts.
    document.addEventListener('error', function (event) { retry(event.target); }, true);
    document.addEventListener('DOMContentLoaded', function () {
        if (getComputedStyle(document.documentElement).getPropertyValue('--ikkyee-styles-ready').trim() === '1') return;
        document.head.querySelectorAll('link[rel="stylesheet"][href]').forEach(retry);
    }, { once: true });
})();
