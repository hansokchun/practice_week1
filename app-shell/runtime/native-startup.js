// Runs independently of the app module and third-party network scripts.
(() => {
    const overlay = document.getElementById('native-startup');
    if (!overlay) return;
    const recovery = document.getElementById('native-startup-recovery');
    const message = document.getElementById('native-startup-message');
    document.getElementById('native-startup-retry').onclick = () => window.location.reload();
    const timer = setTimeout(() => {
        if (overlay.hidden) return;
        overlay.dataset.slow = 'true';
        message.textContent = '연결이 오래 걸리고 있어요. 인터넷 연결을 확인하고 다시 시도해주세요.';
        recovery.hidden = false;
    }, 12000);
    const observer = new MutationObserver(() => {
        if (document.body.classList.contains('is-app-booting')) return;
        clearTimeout(timer);
        overlay.hidden = true;
        observer.disconnect();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
