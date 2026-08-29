const APPLE_TEAM_ID_PATTERN = /^[A-Z0-9]{10}$/u;
const ANDROID_FINGERPRINT_PATTERN = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/u;
function jsonResponse(body, status, cacheControl) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function createAppleAssociationResponse(env) {
  const teamId = typeof env?.APPLE_TEAM_ID === 'string' ? env.APPLE_TEAM_ID.trim() : '';
  if (!APPLE_TEAM_ID_PATTERN.test(teamId)) {
    return jsonResponse({ error: 'not_found' }, 404, 'no-store');
  }
  return jsonResponse({
    applinks: {
      apps: [],
      details: [{ appID: `${teamId}.com.ikkyee.mobile`, paths: ['/photo-link', '/photo-link/'] }]
    }
  }, 200, 'public, max-age=300');
}

export function createAndroidAssociationResponse(env) {
  const raw = typeof env?.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS === 'string'
    ? env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS : '';
  const fingerprints = [...new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))];
  if (fingerprints.length === 0 || fingerprints.some((value) => !ANDROID_FINGERPRINT_PATTERN.test(value))) {
    return jsonResponse({ error: 'not_found' }, 404, 'no-store');
  }
  return jsonResponse([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.ikkyee.mobile',
      sha256_cert_fingerprints: fingerprints
    }
  }], 200, 'public, max-age=300');
}

export function createPhotoLinkFallbackResponse() {
  const body = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ikkyee 공유 사진</title><style>body{background:#f9f7f2;color:#191c1c;font-family:system-ui,sans-serif;margin:0;padding:32px}main{margin:12vh auto;max-width:480px}h1{color:#1a4d4e}a{display:inline-block;margin:8px 8px 0 0;padding:14px 18px;border:1px solid #1a4d4e;border-radius:8px;color:#003637;text-decoration:none}</style></head>
<body><main><p>Ikkyee</p><h1>공유받은 여행 사진</h1><p id="photo-link-status">링크를 확인하고 있습니다.</p><a id="photo-link-open" hidden>Ikkyee 앱에서 열기</a><a href="/">웹 홈으로 이동</a></main><script src="/mobile-photo-link-fallback.js" defer></script></body></html>`;
  return new Response(body, { status: 200, headers: fallbackHeaders('text/html; charset=utf-8') });
}

function fallbackHeaders(contentType = 'text/plain; charset=utf-8') {
  return {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow'
  };
}
