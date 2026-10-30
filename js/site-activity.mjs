export function createVisibleTimeTracker({ now, send }) {
    let started = null, elapsed = 0, finished = false;
    function stop() {
        if (started !== null) elapsed += Math.max(0, now() - started);
        started = null;
    }
    return {
        update({ visible, publicPage }) {
            if (finished) return;
            stop();
            if (visible && publicPage) started = now();
        },
        finish() {
            if (finished) return;
            stop(); finished = true;
            const seconds = Math.min(3600, Math.floor(elapsed / 1000));
            if (seconds >= 1) send({ seconds });
        }
    };
}

export function bindVisibleTimeMeasurement({ document, window }) {
    const publicPages = new Set(['landing', 'home', 'explore', 'tag']);
    const tracker = createVisibleTimeTracker({
        now: () => window.performance.now(),
        send: payload => {
            const body = JSON.stringify(payload);
            try {
                if (window.navigator.sendBeacon?.('/api/site-activity', new Blob([body], { type: 'text/plain' }))) return;
                void window.fetch('/api/site-activity', { method: 'POST', body, credentials: 'omit', keepalive: true,
                    headers: { 'Content-Type': 'text/plain' }, referrerPolicy: 'no-referrer', cache: 'no-store' }).catch(() => {});
            } catch { /* Measurement must never interrupt navigation. */ }
        }
    });
    const isPublic = () => publicPages.has(document.body.dataset.page);
    const update = () => tracker.update({ visible: document.visibilityState === 'visible', publicPage: isPublic() });
    const observer = new MutationObserver(() => {
        if (!isPublic()) { tracker.finish(); observer.disconnect(); }
        else update();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pagehide', () => { tracker.finish(); observer.disconnect(); }, { once: true });
    update();
}
