/**
 * _middleware.js 
 * 모든 /api/* 요청을 가로채서 Supabase JWT 토큰을 검증합니다.
 * 토큰이 유효하면 context.data.userId에 유저 ID를 주입합니다.
 */

function decodeBase64Url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// JWT 검증 (외부 모듈 없이 Web Crypto API 사용)
async function verifyJWT(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');

        const headerBytes = new TextEncoder().encode(parts[0]);
        const payloadBytes = new TextEncoder().encode(parts[1]);
        const signatureBytes = decodeBase64Url(parts[2]);
        const dataToSign = new TextEncoder().encode(parts[0] + '.' + parts[1]);

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            dataToSign
        );

        if (!isValid) throw new Error('Invalid signature');

        const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            throw new Error('Token expired');
        }

        return payload;
    } catch (e) {
        throw new Error('JWT Verification Failed: ' + e.message);
    }
}

export async function onRequest(context) {
    const { request, env, next, data } = context;

    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const secret = env.SUPABASE_JWT_SECRET;

        // 시크릿 키가 설정되지 않았다면 보안상 에러 반환
        if (!secret) {
            return new Response(JSON.stringify({ error: "Server Configuration Error: Missing JWT Secret" }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        try {
            const payload = await verifyJWT(token, secret);
            // 토큰이 올바르면 하위 로직(photos.js)에서 유저정보를 쓸 수 있게 전달
            data.userId = payload.sub;
        } catch (e) {
            return new Response(JSON.stringify({ error: "Unauthorized: " + e.message }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
    } else {
        // 토큰이 없는 비로그인 유저의 경우
        // - GET은 통과 (누구나 사진과 지도를 구경할 순 있음)
        // - POST, DELETE 등 정보를 바꾸려는 시도는 가차없이 차단!
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ error: "Unauthorized: Login required for this action" }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return next();
}
