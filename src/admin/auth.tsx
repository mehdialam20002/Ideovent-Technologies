import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabaseEnabled, supabase } from "@/lib/cms/client";

const PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string) || "ideovent2026";
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
