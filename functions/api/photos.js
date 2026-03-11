export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const photoId = url.searchParams.get("photo_id");

    try {
        // 특정 사진의 댓글 가져오기
        if (photoId) {
            const { results } = await env.DB.prepare("SELECT * FROM comments WHERE photo_id = ? ORDER BY date DESC").bind(photoId.toString()).all();
            return new Response(JSON.stringify(results || []), { 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // 전체 사진 목록 가져오기
        const { results } = await env.DB.prepare("SELECT * FROM photos").all();
        return new Response(JSON.stringify(results || []), { 
            headers: { "Content-Type": "application/json" } 
        });
    } catch (e) {
        // 테이블이 없는 경우 등을 대비해 빈 배열 반환 (에러 문구 노출 방지)
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    if (!env.DB) return new Response("DB binding missing", { status: 500 });

    try {
        const data = await request.json();

        // 1. 댓글 저장 요청 처리
        if (data.type === 'comment') {
            await env.DB.prepare("INSERT INTO comments (photo_id, text, date) VALUES (?, ?, ?)")
                .bind(data.photo_id.toString(), data.text, new Date().toISOString()).run();
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
        }

        // 2. 사진 정보/좋아요 업데이트 처리
        const photo = data;
        let finalUrl = photo.url;
        
        if (photo.url.startsWith('data:')) {
            const fileName = `${photo.id}.jpg`;
            await env.MY_BUCKET.put(fileName, Uint8Array.from(atob(photo.url.split(',')[1]), c => c.charCodeAt(0)), {
                httpMetadata: { contentType: 'image/jpeg' }
            });
            finalUrl = `https://pub-16b2eb5e4ff2442eb3f9e48c634e2912.r2.dev/${fileName}`;
        }

        await env.DB.prepare(
            "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            photo.id.toString(), finalUrl, photo.date, photo.title, photo.description, 
            photo.lat, photo.lng, Number(photo.liked || 0), photo.shared ? 1 : 0
        ).run();

        return new Response(JSON.stringify({ success: true, url: finalUrl }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("ID required", { status: 400 });

    try {
        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM comments WHERE photo_id = ?").bind(id).run();
        try { await env.MY_BUCKET.delete(`${id}.jpg`); } catch (e) {}
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
