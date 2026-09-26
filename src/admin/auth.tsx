import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabaseEnabled, supabase } from "@/lib/cms/client";

/*
  The local passcode. NO FALLBACK ON PURPOSE.

  This used to fall back to a literal default passcode. That default sat in a
  public GitHub repository, so anyone who opened the file could sign in to
  /admin on any deploy where the env var had not been set, which was every
  deploy. Removing it means a missing env var locks the panel instead of
  opening it. (The old default is burned: never reuse it anywhere.)

  Even set, this is a SPEED BUMP, not a lock: Vite inlines every VITE_* value
  into the bundle at build time, so it is readable with View Source on the live
  site. Real protection is the Supabase branch below, where the password is
  checked server-side and never reaches the browser. Fill VITE_SUPABASE_URL and
  VITE_SUPABASE_ANON_KEY and this file switches to it automatically.
*/
const PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string) || "";
const LOCAL_LOGIN_ENABLED = PASSCODE.length > 0;
const SESSION_KEY = "ideovent_admin_session";

interface AuthValue {
  authed: boolean;
  mode: "local" | "supabase";
  login: (a: string, b?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const mode = supabaseEnabled ? "supabase" : "local";
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (mode === "supabase") {
        const { data } = await supabase().auth.getSession();
        if (alive) setAuthed(Boolean(data.session));
        supabase().auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
      } else {
        setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  const login: AuthValue["login"] = async (a, b) => {
    if (mode === "supabase") {
      const { error } = await supabase().auth.signInWithPassword({ email: a, password: b || "" });
      if (error) return { ok: false, error: error.message };
      setAuthed(true);
      return { ok: true };
    }
    if (!LOCAL_LOGIN_ENABLED) {
      return {
        ok: false,
        error:
          "Admin sign-in is not configured on this deploy. Set VITE_ADMIN_PASSCODE, " +
          "or connect Supabase for proper server-side auth.",
      };
    }
    if (a === PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      return { ok: true };
    }
    return { ok: false, error: "Incorrect passcode." };
  };

  const logout = async () => {
    if (mode === "supabase") await supabase().auth.signOut();
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  };

  return <AuthContext.Provider value={{ authed, mode, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within <AdminAuthProvider>");
  return ctx;
}
