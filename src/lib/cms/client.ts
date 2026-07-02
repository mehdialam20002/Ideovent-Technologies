import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the site has been wired to a Supabase project (live global mode). */
export const supabaseEnabled = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!supabaseEnabled) throw new Error("Supabase is not configured.");
  if (!_client) _client = createClient(url as string, anonKey as string);
  return _client;
}
