(() => {
  const token = globalThis.location.hash.slice(1);
  const openLink = document.getElementById('photo-link-open');
  const status = document.getElementById('photo-link-status');
  const valid = /^[0-9a-f]{64}$/.test(token);
  if (openLink instanceof HTMLAnchorElement && status instanceof HTMLElement && valid) {
    openLink.href = `ikkyee://photo-link/${token}`;
    openLink.hidden = false;
    status.textContent = '앱이 설치되어 있으면 아래 버튼으로 사진을 열 수 있습니다.';
  } else if (status instanceof HTMLElement) {
    status.textContent = '링크가 잘못되었거나 더 이상 사용할 수 없습니다.';
  }
  globalThis.history.replaceState(null, document.title, globalThis.location.pathname);
})();
