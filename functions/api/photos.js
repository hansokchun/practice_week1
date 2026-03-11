export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const photoId = url.searchParams.get("photo_id");

    // 댓글 가져오기 요청인 경우
    if (photoId) {
        const { results } = await env.DB.prepare("SELECT * FROM comments WHERE photo_id = ? ORDER BY date DESC").bind(photoId).all();
        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
    }

    // 사진 목록 가져오기 (좋아요 수 포함하도록 로직 확장 가능하나 일단 단순 유지)
    const { results } = await env.DB.prepare("SELECT * FROM photos").all();
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost(context) {
    const { env, request } = context;
    const photo = await request.json();

    // 댓글 저장 요청인 경우
    if (photo.type === 'comment') {
        await env.DB.prepare("INSERT INTO comments (photo_id, text, date) VALUES (?, ?, ?)")
            .bind(photo.photo_id, photo.text, new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }));
    }

    // 사진 정보/좋아요 업데이트
    let finalUrl = photo.url;
    if (photo.url.startsWith('data:')) {
        const fileName = `${photo.id}.jpg`;
        await env.MY_BUCKET.put(fileName, Uint8Array.from(atob(photo.url.split(',')[1]), c => c.charCodeAt(0)), {
            httpMetadata: { contentType: 'image/jpeg' }
        });
        finalUrl = `https://pub-16b2eb5e4ff2442eb3f9e48c634e2912.r2.dev/${fileName}`;
    }

    // 좋아요 수(liked)를 숫자로 저장하도록 처리
    await env.DB.prepare(
        "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
        photo.id.toString(), finalUrl, photo.date, photo.title, photo.description, 
        photo.lat, photo.lng, photo.liked || 0, photo.shared ? 1 : 0
    ).run();

    return new Response(JSON.stringify({ success: true, url: finalUrl }));
}

export async function onRequestDelete(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM comments WHERE photo_id = ?").bind(id).run();
    try { await env.MY_BUCKET.delete(`${id}.jpg`); } catch (e) {}
    return new Response(JSON.stringify({ success: true }));
}
