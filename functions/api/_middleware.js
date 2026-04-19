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

// JWT 퍼블릭 키 인메모리 캐싱 (Isolate 라이프사이클 동안 유지)
let cachedKey = null;

async function getPublicKey(header) {
    if (cachedKey) return cachedKey;
    
    // 사용자님의 Supabase 퍼블릭 JWKS 엔드포인트에서 동적으로 키를 가져옵니다.
    const res = await fetch('https://pqczcponriukilrtpbdl.supabase.co/auth/v1/.well-known/jwks.json');
    if (!res.ok) throw new Error('Failed to fetch JWKS');
    const data = await res.json();
    
    const jwk = data.keys.find(k => k.kid === header.kid) || data.keys[0];
    if (!jwk) throw new Error('Valid public key not found from Supabase');
    
    let importAlgo;
    if (jwk.kty === 'EC') { // ES256 (최신 Supabase 기본값)
        importAlgo = { name: 'ECDSA', namedCurve: jwk.crv || 'P-256' };
    } else if (jwk.kty === 'RSA') { // RS256
        importAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } };
    } else {
        throw new Error('Unsupported key type');
    }

    cachedKey = await crypto.subtle.importKey('jwk', jwk, importAlgo, false, ['verify']);
    return cachedKey;
}

// JWT 검증 (최신 ES256/RS256 지원)
async function verifyJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid token format');

        // 헤더 디코딩 (알고리즘 및 kid 확인)
        const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
        const signatureBytes = decodeBase64Url(parts[2]);
        const dataToSign = new TextEncoder().encode(parts[0] + '.' + parts[1]);

        const key = await getPublicKey(header);

        let verifyAlgo;
        if (key.algorithm.name === 'ECDSA') verifyAlgo = { name: 'ECDSA', hash: { name: 'SHA-256' } };
        else if (key.algorithm.name === 'RSASSA-PKCS1-v1_5') verifyAlgo = { name: 'RSASSA-PKCS1-v1_5' };

        const isValid = await crypto.subtle.verify(verifyAlgo, key, signatureBytes, dataToSign);

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
    const { request, next, data } = context;

    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const payload = await verifyJWT(token);
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
