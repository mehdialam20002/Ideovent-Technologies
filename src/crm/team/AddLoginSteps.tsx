import { useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { SUPABASE_URL } from "@/lib/cms/config";
import { CRM_ORIGIN, isCrmHost, MAIN_ORIGIN } from "@/lib/host";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { crm } from "../ui";
import { CopyButton, Note } from "./teamUi";

/**
 * CREATE THEIR LOGIN (spec 5.1). No secret key anywhere: Mehdi makes the
 * login in the Supabase dashboard he already signs in to, with a temporary
 * password made here, and the first sign-in links it to the Team row by its
 * confirmed e-mail (crm_me; "Check logins" links it at once).
 */

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A temporary password made in this browser: 14 characters without look-alikes. Shown once, never stored. */
export function makeTempPassword(length = 14): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** The project's ref: the subdomain of VITE_SUPABASE_URL ("abcd" in https://abcd.supabase.co). */
export function supabaseRef(url: string | undefined = SUPABASE_URL): string {
  try {
    return url ? new URL(url).hostname.split(".")[0] : "";
  } catch {
    return "";
  }
}

/** Supabase > Authentication > Users for this project. */
export function supabaseUsersUrl(): string {
  const ref = supabaseRef();
  return ref ? `https://supabase.com/dashboard/project/${ref}/auth/users` : "https://supabase.com/dashboard/projects";
}

/** Where the team signs in: the CRM's own address once it has one (crm.ideovent.in), else /crm on the main site. */
export function crmAddress(): string {
  if (CRM_ORIGIN) return CRM_ORIGIN;
  if (isCrmHost() && typeof window !== "undefined") return window.location.origin;
  return `${MAIN_ORIGIN}/crm`;
}

/** "Send them this": the address, their e-mail and the temporary password, ready to paste into WhatsApp. */
export function sendThemText(name: string, email: string, password: string): string {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return [
    `Hi ${first}, your login to the Ideovent CRM:`,
    crmAddress(),
    `E-mail: ${email}`,
    `Temporary password: ${password}`,
    "Sign in, then set your own password.",
  ].join("\n");
}

export function AddLoginSteps({ name, email, linked, onCheck }: {
  name: string;
  email: string;
  /** Their login is linked to the Team row (crm_link_logins found it, or they signed in). */
  linked: boolean;
  onCheck: () => Promise<void>;
}) {
  const { mode } = useCrmMe();
  const [password] = useState(makeTempPassword);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  if (mode === "local") {
    return (
      <Note testId="add-login-local">Local mode: logins are simulated. Use Act as (top right) to try this person.</Note>
    );
  }
  const step = "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[13px]";
  return (
    <section data-testid="add-login-steps" aria-labelledby="add-login-h" className="space-y-2.5">
      <h3 id="add-login-h" className="text-[14px] font-semibold">Create their login</h3>
      <ol className="list-decimal space-y-2 pl-5 text-[13px] marker:text-muted-foreground">
        <li>
          <div className={step}>
            <span className="min-w-0 flex-1 break-all font-medium">{email}</span>
            <CopyButton text={email} label="Copy e-mail" />
          </div>
        </li>
        <li>
          <div className={step}>
            <span className="min-w-0 flex-1 break-all font-mono text-[14px] tracking-wide" data-testid="temp-password">{password}</span>
            <CopyButton text={password} label="Copy password" />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">A temporary password, shown once and saved nowhere. They set their own at the first sign-in.</p>
        </li>
        <li>
          <a href={supabaseUsersUrl()} target="_blank" rel="noopener noreferrer" className={cn(crm.btn, "max-md:h-11")}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open Supabase Users
          </a>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Add user &gt; Create new user &gt; paste the e-mail and the password &gt; tick <strong>Auto Confirm User</strong> &gt; Create user.
          </p>
        </li>
        <li>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={sendThemText(name, email, password)} label="Send them this" testId="send-them-this" />
            <span className="text-[12px] text-muted-foreground">The CRM address, their e-mail and this password, to paste into WhatsApp.</span>
          </div>
        </li>
        <li>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={cn(crm.btn, "max-md:h-11")} disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await onCheck();
                } finally {
                  setChecking(false);
                  setChecked(true);
                }
              }}>
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} aria-hidden="true" /> Check logins
            </button>
            {linked ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Login linked
              </span>
            ) : (
              checked && <span className="text-[12px] text-muted-foreground">Not found yet: create it in Supabase first (with Auto Confirm).</span>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
