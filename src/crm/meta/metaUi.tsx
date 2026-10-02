import { useState, type ReactNode } from "react";
import { Check, CircleDashed, Copy, KeyRound, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyText } from "../team/teamUi";
import { crm } from "../ui";

/**
 * Small pieces the Meta Lead Ads screens share (src/crm/meta, meta-leads-spec
 * 6.1): a status line with a green tick, an amber "needs you" or a grey "not
 * yet"; a value to copy; "Make one" for a random secret; India-time dates.
 */

/** Where Meta sends its notifications: always the main site's own address. */
export const META_WEBHOOK_URL = "https://www.ideovent.in/api/meta/webhook";
/** The Make fallback's address (spec 4.8, step 21). */
export const META_RELAY_URL = "https://www.ideovent.in/api/meta/relay";

export type LineState = "done" | "warn" | "todo";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ist(iso: string | null | undefined): Date | null {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t + 330 * 60000) : null;
}
const two = (n: number) => String(n).padStart(2, "0");

/** "2 Oct, 10:40" (India time); "" when not a date. */
export function fmtIstShort(iso: string | null | undefined): string {
  const d = ist(iso);
  return d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}` : "";
}

/** "1 Dec 2026" (India time). */
export function fmtIstDate(iso: string | null | undefined): string {
  const d = ist(iso);
  return d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "";
}

/** "today at 09:21", or "2 Oct, 09:21". */
export function fmtIstWhen(iso: string | null | undefined, now = new Date()): string {
  const d = ist(iso);
  const n = ist(now.toISOString());
  if (!d || !n) return "";
  return d.toISOString().slice(0, 10) === n.toISOString().slice(0, 10) ? `today at ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}` : fmtIstShort(iso);
}

/** A Meta id shortened for a line ("…412345"); the whole id is in the title. */
export function idTail(id: string | null | undefined): string {
  return id ? (id.length > 8 ? `…${id.slice(-6)}` : id) : "";
}

const ICON = {
  done: { Icon: Check, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", word: "Done" },
  warn: { Icon: TriangleAlert, cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300", word: "Needs you" },
  todo: { Icon: CircleDashed, cls: "bg-muted text-muted-foreground", word: "Not yet" },
} as const;

/** One status line: what, its state, and the sentence that says what to do. */
export function StateLine({ state, label, children, testId, row }: { state: LineState; label: string; children: ReactNode; testId?: string; row?: string }) {
  const { Icon, cls, word } = ICON[state];
  return (
    <li data-testid={testId} data-row={row} data-state={state} className="flex min-w-0 items-start gap-2.5 py-2">
      <span className={cn("mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", cls)}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">{word}:</span>
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground"> · </span>
        <span className={cn("break-words", state === "warn" ? "text-amber-900 dark:text-amber-200" : "text-foreground")}>{children}</span>
      </span>
    </li>
  );
}

/** A value to copy (an address, a variable name), wrapping on a phone instead of scrolling. */
export function CopyValue({ value, testId, label }: { value: string; testId?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
      <code data-testid={testId} className="min-w-0 break-all rounded bg-muted px-1.5 py-0.5 text-[12px]">{value}</code>
      <button
        type="button"
        className={cn(crm.btnGhost, "h-8 w-8 shrink-0 px-0 max-md:h-11 max-md:w-11")}
        aria-label={`Copy ${label || value}`}
        title="Copy"
        onClick={async () => {
          setDone(await copyText(value));
          window.setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </span>
  );
}

/** 40 letters and digits from this browser's random generator. Never stored or sent anywhere. */
export function randomWord(length = 40): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const out: string[] = [];
  const bytes = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(bytes);
    // alpha has 57 characters; 228 = 4 x 57, so bytes from 228 up would favour the first ones: they are dropped.
    for (const b of bytes) if (b < 228 && out.length < length) out.push(alpha[b % 57]);
  }
  return out.join("");
}

/**
 * "Make one": a fresh random word for a Vercel value (META_VERIFY_TOKEN,
 * CRON_SECRET, META_RELAY_SECRET), shown here once. Nothing keeps it.
 */
export function MakeOne({ name, where = "in Vercel and in Meta's dashboard" }: { name: string; where?: string }) {
  const [word, setWord] = useState("");
  return (
    <div data-testid="meta-make-token" data-for={name} className="mt-1.5 space-y-1.5">
      <button type="button" className={cn(crm.btn, "max-md:h-11")} onClick={() => setWord(randomWord())}>
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Make one for {name}
      </button>
      {word && (
        <div className="space-y-1">
          <CopyValue value={word} label={`the new ${name}`} />
          <p className="text-[12px] text-muted-foreground">
            Made in this browser, kept nowhere. Paste it {where}, nowhere else.
          </p>
        </div>
      )}
    </div>
  );
}
