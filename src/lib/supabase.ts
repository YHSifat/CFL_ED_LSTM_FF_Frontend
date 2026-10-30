import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only client: the anon key can only `select` (RLS), never write.
 * Never put the service_role key or the database password here.
 * Both values are inlined at build time, so they must be referenced directly.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
