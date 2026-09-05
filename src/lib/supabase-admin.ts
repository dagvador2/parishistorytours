/**
 * Server-only Supabase client with the service role (bypasses RLS). Used by
 * the self-guided tour routes: digital_purchases is not readable by anon.
 * Never import this from client code.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const url = meta?.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
    const key = meta?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
