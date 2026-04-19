/**
 * photos.js — 사진 CRUD API 핸들러
 * 
 * 인증 통합 후 변경 사항:
 * - _middleware.js에서 주입한 context.data.userId를 통해 현재 로그인 유저 식별
 * - 사진(마커) 등록 시 owner_id 저장
 * - DELETE/UPDATE 시 owner_id 소유권이 본인인지 강력하게 검증
 */

export async function onRequestGet(context) {
    const { env, request, data } = context;
    const url = new URL(request.url);
    const photoId = url.searchParams.get("photo_id");
    const userId = data?.userId || null; 

    try {
        if (!env.DB) throw new Error("DB binding missing");

        // 특정 사진의 댓글 정보를 가져올 때
        if (photoId) {
            const { results } = await env.DB.prepare("SELECT * FROM comments WHERE photo_id = ? ORDER BY date DESC")
                .bind(photoId.toString())
                .all();
            return new Response(JSON.stringify(results || []), { 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // 전체 마커(사진) 데이터를 로드할 때
        let results;
        if (userId) {
            // 로그인 상태: 본인이 올린 사진이거나, 공유(shared=1)된 사진, 과거 유산(owner_id IS NULL) 모두 표시
            const stmt = await env.DB.prepare(
                "SELECT * FROM photos WHERE owner_id = ? OR shared = 1 OR owner_id IS NULL ORDER BY date DESC"
            ).bind(userId);
            results = (await stmt.all()).results;
        } else {
            // 비로그인 상태: 다른 사람이 '공개(shared)'로 설정한 사진만 구경 가능
            const stmt = await env.DB.prepare(
                "SELECT * FROM photos WHERE shared = 1 OR owner_id IS NULL ORDER BY date DESC"
            );
            results = (await stmt.all()).results;
        }

        return new Response(JSON.stringify(results || []), { 
            headers: { "Content-Type": "application/json" } 
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message, results: [] }), { 
            status: 500,
            headers: { "Content-Type": "application/json" } 
        });
    }
}

export async function onRequestPost(context) {
    const { env, request, data } = context;
    const userId = data?.userId; 

    if (!env.DB) return new Response("DB binding missing", { status: 500 });
    // 미들웨어에서 걸러졌겠지만 안전을 위해 이중 락
    if (!userId) return new Response("Unauthorized", { status: 401 });

    try {
        const body = await request.json();

        // 1. 댓글 쓰기 기능 검증 및 삽입
        if (body.type === 'comment') {
            if (!body.photo_id || !body.text) {
                return new Response(JSON.stringify({ error: "Missing photo_id or text" }), { status: 400 });
            }
            await env.DB.prepare("INSERT INTO comments (photo_id, text, date, author_id) VALUES (?, ?, ?, ?)")
                .bind(body.photo_id.toString(), body.text, new Date().toISOString(), userId)
                .run();
            return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
        }

        // 2. 새로운 사진(마커) 추가 또는 수정
        const photo = body;
        let finalUrl = photo.url;

        // 이미지 파일 데이터(Base64)가 있으면 R2 버킷에 저장하고 URL 생성
        if (photo.url && photo.url.startsWith('data:')) {
            const fileName = `${photo.id}.jpg`;
            await env.MY_BUCKET.put(fileName, Uint8Array.from(atob(photo.url.split(',')[1]), c => c.charCodeAt(0)), {
                httpMetadata: { contentType: 'image/jpeg' }
            });
            // Public R2 접근 링크
            finalUrl = `https://pub-16b2eb5e4ff2442eb3f9e48c634e2912.r2.dev/${fileName}`;
        }

        const existing = await env.DB.prepare("SELECT owner_id FROM photos WHERE id = ?")
            .bind(photo.id.toString())
            .first();

        // 소유권 검증 (해당 사진의 주인이 아닌데 제목/내용을 수정하려 한다면 차단, 단 '좋아요'는 예외)
        if (existing && existing.owner_id && existing.owner_id !== userId) {
            if (photo.title !== undefined || photo.description !== undefined) {
                return new Response(
                    JSON.stringify({ error: "본인의 사진만 수정할 수 있습니다." }),
                    { status: 403, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // 신규 업로드면 현재 접속자 ID를, 기존 수정이면 기존 주인의 ID 배정
        const ownerId = existing?.owner_id || userId;

        await env.DB.prepare(
            "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            photo.id.toString(), finalUrl, photo.date, photo.title, photo.description, 
            photo.lat, photo.lng, Number(photo.liked || 0), photo.shared ? 1 : 0, ownerId
        ).run();

        return new Response(JSON.stringify({ success: true, url: finalUrl }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" } 
        });
    }
}

export async function onRequestDelete(context) {
    const { env, request, data } = context;
    const userId = data?.userId;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) return new Response("ID required", { status: 400 });
    if (!userId) return new Response("Unauthorized", { status: 401 });

    try {
        const photo = await env.DB.prepare("SELECT owner_id FROM photos WHERE id = ?")
            .bind(id)
            .first();

        // 삭제하려는 사진이 데이터베이스에 존재하지 않을 때
        if (!photo) {
            return new Response(JSON.stringify({ error: "사진을 찾을 수 없습니다." }), { 
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 남의 사진을 삭제하려고 시도할 때 강제로 튕겨내기 (권한 우회 방지)
        if (photo.owner_id && photo.owner_id !== userId) {
            return new Response(JSON.stringify({ error: "본인의 사진만 삭제할 수 있습니다." }), { 
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
        // 삭제 성공 시 관련 댓글 파기
        await env.DB.prepare("DELETE FROM comments WHERE photo_id = ?").bind(id).run();
        // R2 스토리지의 실제 이미지 파일 삭제 시도 (실패해도 앱은 돌아가도록 try catch 적용)
        try { await env.MY_BUCKET.delete(`${id}.jpg`); } catch (e) {}
        
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
