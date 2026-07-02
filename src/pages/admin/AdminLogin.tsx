import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/admin/auth";
import { Aurora } from "@/components/ui/aurora";
import { Seo } from "@/components/seo/Seo";

export default function AdminLogin() {
  const { login, mode, authed } = useAdminAuth();
  const navigate = useNavigate();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (authed) navigate("/admin", { replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(a, b);
    setBusy(false);
    if (res.ok) navigate("/admin", { replace: true });
    else setError(res.error || "Login failed");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <Seo title="Admin login" noindex />
      <Aurora />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-3xl border border-border bg-card/70 p-8 backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin access</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "supabase" ? "Sign in with your email and password." : "Enter your admin passcode."}</p>
        </div>

        {mode === "supabase" ? (
          <div className="space-y-3">
            <input type="email" value={a} onChange={(e) => setA(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <input type="password" value={b} onChange={(e) => setB(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
        ) : (
          <input type="password" value={a} onChange={(e) => setA(e.target.value)} placeholder="Passcode" autoFocus className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
        )}

        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
        </button>
      </form>
    </div>
  );
}
