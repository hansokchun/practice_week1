// Runs independently of the app module and third-party network scripts.
(() => {
    const mark = stage => { try { window.IkkyeeBoot?.mark(stage); } catch {} };
    mark('WATCHDOG_READY');
    const failure = (error, filename = '', line = 0, column = 0) => {
        mark('SCRIPT_ERROR');
        const position = String(error?.stack || '').match(/https:\/\/localhost\/([^\s):]*):(\d+):(\d+)/);
        if (position) { filename = position[1]; line = Number(position[2]); column = Number(position[3]); }
        const kind = ['TypeError', 'ReferenceError', 'SyntaxError'].includes(error?.name) ? error.name : 'Error';
        const source = /(?:^|\/)assets\/index-/.test(filename) ? 'APP'
            : filename.includes('native-supabase.js') ? 'SDK' : !filename || /https:\/\/localhost\/?$/.test(filename) ? 'BRIDGE' : 'OTHER';
        try { window.IkkyeeBoot?.failure(kind + '_' + source, line, column); } catch {}
    };
    window.addEventListener('error', event => event.error
        ? failure(event.error, event.filename, event.lineno, event.colno) : mark('RESOURCE_ERROR'), true);
    window.addEventListener('unhandledrejection', event => failure(event.reason));
    const overlay = document.getElementById('native-startup');
    if (!overlay) return;
    const recovery = document.getElementById('native-startup-recovery');
    const message = document.getElementById('native-startup-message');
    document.getElementById('native-startup-retry').onclick = () => window.location.reload();
    const timer = setTimeout(() => {
        if (overlay.hidden) return;
        mark('BOOT_TIMEOUT');
        overlay.dataset.slow = 'true';
        message.textContent = '연결이 오래 걸리고 있어요. 인터넷 연결을 확인하고 다시 시도해주세요.';
        recovery.hidden = false;
    }, 12000);
    const hideWhenReady = () => {
        if (document.body.classList.contains('is-app-booting')
            && document.body.dataset?.nativeUiReady !== 'true') return;
        clearTimeout(timer);
        overlay.hidden = true;
        observer.disconnect();
    };
    const observer = new MutationObserver(hideWhenReady);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-native-ui-ready'] });
    hideWhenReady();
})();
