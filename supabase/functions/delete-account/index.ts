import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";

const allowedOrigins = new Set([
  "https://practice-week1-cws.pages.dev",
  "https://dev.practice-week1-cws.pages.dev"
]);
const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (origin === null || !allowedOrigins.has(origin)) return {};
  return {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin"
  };
}

function json(request: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders, ...corsHeaders(request) }
  });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || header.length > 4096) return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/u.exec(header);
  return match?.[1] ?? null;
}

function safeOwnedPath(path: unknown, userId: string): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) &&
    !path.includes("..") && !path.includes("\\") && path.length <= 1024;
}

async function listOwnedObjects(client: SupabaseClient, bucket: string, userId: string): Promise<string[]> {
  const paths: string[] = [];
  const folders = [userId];
  while (folders.length > 0) {
    const folder = folders.shift()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.storage.from(bucket).list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" }
      });
      if (error !== null) throw error;
      const entries = data ?? [];
      for (const entry of entries) {
        const path = `${folder}/${entry.name}`;
        if (!safeOwnedPath(path, userId)) throw new Error("unsafe storage path");
        if (entry.id === null) folders.push(path);
        else paths.push(path);
      }
      if (entries.length < 100) break;
      if (paths.length + folders.length > 10_000) throw new Error("storage object limit exceeded");
    }
  }
  return paths;
}

async function removeOwnedObjects(client: SupabaseClient, userId: string): Promise<void> {
  for (const bucket of ["photos", "avatars"] as const) {
    const paths = await listOwnedObjects(client, bucket, userId);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await client.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error !== null) throw error;
    }
  }
}

async function checkedDelete(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query;
  if (error !== null) throw error;
}

async function deleteOwnedRows(client: SupabaseClient, userId: string): Promise<void> {
  await checkedDelete(client.from("content_reports").delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`));
  await checkedDelete(client.from("user_blocks").delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`));
  await checkedDelete(client.from("comments").delete().eq("author_id", userId));
  await checkedDelete(client.from("user_likes").delete().eq("user_id", userId));
  await checkedDelete(client.from("photos").delete().eq("owner_id", userId));
  await checkedDelete(client.from("albums").delete().eq("owner_id", userId));
  await checkedDelete(client.from("profiles").delete().eq("id", userId));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "not_found" }, 404);
  if (Number(request.headers.get("content-length") ?? "0") > 256) return json(request, { error: "invalid_request" }, 400);

  const accessToken = bearerToken(request);
  if (accessToken === null) return json(request, { error: "unauthorized" }, 401);

  let confirmation: unknown;
  try {
    const body: unknown = await request.json();
    confirmation = typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)["confirmation"]
      : undefined;
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }
  if (confirmation !== "DELETE_ACCOUNT") return json(request, { error: "confirmation_required" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url === undefined || secret === undefined) return json(request, { error: "unavailable" }, 503);

  const client = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
  if (authError !== null || user === null) return json(request, { error: "unauthorized" }, 401);

  try {
    await removeOwnedObjects(client, user.id);
    await deleteOwnedRows(client, user.id);
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error !== null) throw error;
  } catch {
    return json(request, { error: "delete_failed" }, 503);
  }

  return json(request, { deleted: true }, 200);
});
