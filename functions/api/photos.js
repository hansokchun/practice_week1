export async function onRequestGet(context) {
    const { env } = context;
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is missing." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    try {
        const { results } = await env.DB.prepare("SELECT * FROM photos").all();
        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    if (!env.DB || !env.MY_BUCKET) {
        return new Response(JSON.stringify({ error: "Database or Bucket binding is missing." }), { status: 500 });
    }

    try {
        const photo = await request.json();
        
        // 1. Base64 데이터를 바이너리로 변환
        const base64Data = photo.url.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // 2. R2 버킷에 파일 저장
        const fileName = `${photo.id}.jpg`;
        await env.MY_BUCKET.put(fileName, binaryData, {
            httpMetadata: { contentType: 'image/jpeg' }
        });
        
        // 3. R2 공개 URL 생성 (사용자가 알려준 주소 사용)
        const publicUrl = `https://pub-16b2eb5e4ff2442eb3f9e48c634e2912.r2.dev/${fileName}`;
        
        // 4. D1 데이터베이스에는 '공개 URL'을 저장
        await env.DB.prepare(
            "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            photo.id.toString(),
            publicUrl, // 원본 base64 대신 R2 주소 저장!
            photo.date,
            photo.title,
            photo.description,
            photo.lat,
            photo.lng,
            photo.liked ? 1 : 0,
            photo.shared ? 1 : 0
        ).run();
        
        return new Response(JSON.stringify({ success: true, url: publicUrl }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, request } = context;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response("ID required", { status: 400 });
        
        // 1. D1에서 정보 삭제 전 파일명 확인 (선택사항이지만 깔끔하게 관리하려면 R2에서도 지울 수 있습니다)
        // 여기서는 간단하게 D1에서만 삭제하도록 하겠습니다.
        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
        
        // 2. R2 파일도 삭제 (파일명은 id.jpg 형식)
        await env.MY_BUCKET.delete(`${id}.jpg`);
        
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
