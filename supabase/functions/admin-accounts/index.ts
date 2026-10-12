import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { createAdminAccountsHandler } from './handler.mjs';
import { createAdminAccountsRepository } from './repository.mjs';

const url = Deno.env.get('SUPABASE_URL');
const secret = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !secret) {
    Deno.serve(() => new Response('Unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }));
} else {
    const client = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    // The handler verifies every access token with Auth and rechecks the current admin record.
    Deno.serve(createAdminAccountsHandler(createAdminAccountsRepository(client)));
}
