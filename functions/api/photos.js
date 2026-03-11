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
        let finalUrl = photo.url;

        // 1. 만약 사진 데이터가 Base64(신규 업로드)라면 R2에 저장
        if (photo.url.startsWith('data:')) {
            const base64Data = photo.url.split(',')[1];
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `${photo.id}.jpg`;
            
            await env.MY_BUCKET.put(fileName, binaryData, {
                httpMetadata: { contentType: 'image/jpeg' }
            });
            
            finalUrl = `https://pub-16b2eb5e4ff2442eb3f9e48c634e2912.r2.dev/${fileName}`;
        }
        
        // 2. D1 데이터베이스 업데이트 (공유 상태 포함)
        await env.DB.prepare(
            "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            photo.id.toString(),
            finalUrl,
            photo.date,
            photo.title,
            photo.description,
            photo.lat,
            photo.lng,
            photo.liked ? 1 : 0,
            photo.shared ? 1 : 0
        ).run();
        
        return new Response(JSON.stringify({ success: true, url: finalUrl }), {
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
        
        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
        try {
            await env.MY_BUCKET.delete(`${id}.jpg`);
        } catch (e) {} // 파일이 없어도 에러 무시
        
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
