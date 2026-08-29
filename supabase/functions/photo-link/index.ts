import { createClient } from "npm:@supabase/supabase-js@2.112.3";

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
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
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

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "not_found" }, 404);
  if (Number(request.headers.get("content-length") ?? "0") > 512) {
    return json(request, { error: "not_found" }, 404);
  }

  let token: unknown;
  try {
    const body: unknown = await request.json();
    token = typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)["token"]
      : undefined;
  } catch {
    return json(request, { error: "not_found" }, 404);
  }
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/u.test(token)) {
    return json(request, { error: "not_found" }, 404);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url === undefined || secret === undefined) return json(request, { error: "unavailable" }, 503);

  const client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const tokenHash = await sha256(token);
  const { data: photo, error } = await client
    .from("photos")
    .select("id,date,description,liked,owner_id,created_at,storage_path")
    .eq("link_token_hash", tokenHash)
    .eq("visibility", "private")
    .eq("shared", false)
    .maybeSingle();

  if (error !== null || photo === null || typeof photo.storage_path !== "string") {
    return json(request, { error: "not_found" }, 404);
  }
  const { data: signed, error: signError } = await client.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, 300);
  if (signError !== null || signed === null) return json(request, { error: "not_found" }, 404);

  return json(request, {
    photo: {
      id: photo.id,
      date: photo.date,
      description: photo.description,
      liked: photo.liked,
      ownerId: photo.owner_id,
      createdAt: photo.created_at,
      imageUrl: signed.signedUrl
    }
  }, 200);
});
