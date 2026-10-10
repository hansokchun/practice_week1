const SUPABASE_URL = 'https://pqczcponriukilrtpbdl.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_m158oMsJtKHn2sUD3m7x-w_Rs6swjl8';
const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function createShareResponse(request, segments = [], fetcher = fetch) {
    const [type, id] = segments;
    if (segments.length !== 2 || !['photo', 'album'].includes(type) || !id || id.length > 150 || /[\x00-\x1f]/.test(id)) {
        return new Response('공유할 항목을 찾을 수 없습니다.', { status: 404, headers });
    }
    const getRows = async (table, params) => {
        const result = await fetcher(`${SUPABASE_URL}/rest/v1/${table}?${new URLSearchParams(params)}`, {
            headers: { apikey: PUBLISHABLE_KEY }, signal: AbortSignal.timeout(8000)
        });
        if (!result.ok) throw new Error('Share lookup failed');
        return result.json();
    };
    try {
        // Always use anonymous RLS and explicit public filters; never forward a viewer's session.
        const rows = await getRows(type === 'photo' ? 'photos' : 'albums', {
            id: `eq.${id}`, visibility: 'eq.public', limit: '1',
            select: type === 'photo' ? 'id,title,description,visibility,preview_path,thumbnail_path,storage_path' : 'id,title,visibility'
        });
        const item = rows[0];
        if (!item || item.visibility !== 'public') return new Response('공개되지 않았거나 삭제된 항목입니다.', { status: 404, headers });
        const url = new URL(request.url);
        const canonical = `${url.origin}/share/${type}/${encodeURIComponent(id)}`;
        if (url.searchParams.get('image') === '1') {
            const photo = type === 'photo' ? item : (await getRows('album_photos', {
                album_id: `eq.${id}`, 'photos.visibility': 'eq.public', order: 'sort_order.asc', limit: '1',
                select: 'photos!inner(id,visibility,preview_path,thumbnail_path,storage_path)'
            }))[0]?.photos;
            const path = photo?.preview_path || photo?.thumbnail_path;
            if (!path || photo.visibility !== 'public') return new Response('공개 미리보기 사진이 없습니다.', { status: 404, headers });
            const image = await fetcher(`${SUPABASE_URL}/storage/v1/object/authenticated/photos/${path.split('/').map(encodeURIComponent).join('/')}`, {
                headers: { apikey: PUBLISHABLE_KEY }, signal: AbortSignal.timeout(8000)
            });
            const contentType = image.headers.get('content-type') || '';
            if (!image.ok || !/^image\/(jpeg|png|webp|avif)(;|$)/i.test(contentType)) throw new Error('Share image unavailable');
            return new Response(image.body, { headers: { ...headers, 'Content-Type': contentType } });
        }
        const target = type === 'photo' ? `/#/?photo=${encodeURIComponent(id)}` : `/#/trip?album=${encodeURIComponent(id)}`;
        const title = String(item.title || item.description || (type === 'photo' ? '이끼의 한 장면' : '이끼 여행 앨범')).slice(0, 100);
        const description = type === 'photo' ? '사진 속 장소를 이끼에서 만나보세요.' : '여행의 사진과 장소를 함께 둘러보세요.';
        const nonce = crypto.randomUUID();
        const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · 이끼</title><meta property="og:type" content="website"><meta property="og:site_name" content="Ikkyee 이끼"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${description}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(canonical)}?image=1"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="noindex"><link rel="canonical" href="${escape(canonical)}"></head><body><h1>${escape(title)}</h1><p>${description}</p><a href="${escape(target)}">${type === 'photo' ? '사진' : '앨범'} 보기</a><script nonce="${nonce}">location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')})</script></body></html>`;
        return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'` } });
    } catch {
        return new Response('잠시 후 다시 시도해주세요.', { status: 503, headers });
    }
}
