import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "./config";

// Re-exported so existing callers keep working. Import it from "./config" instead if you
// only need the flag, importing this module pulls in the whole Supabase SDK.
export { supabaseEnabled };

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!supabaseEnabled) throw new Error("Supabase is not configured.");
  if (!_client) _client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  return _client;
}
