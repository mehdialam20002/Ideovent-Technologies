/**
 * Supabase configuration flags.
 *
 * Deliberately separate from `client.ts`: `client.ts` imports the Supabase SDK, and
 * anything that imports `client.ts` drags the whole SDK with it. `store.ts` only needs
 * to know *whether* Supabase is configured in order to choose a store, so it reads that
 * from here and the SDK stays out of the main chunk.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the site has been wired to a Supabase project (live global mode). */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
