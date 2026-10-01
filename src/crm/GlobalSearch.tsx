import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { LeadStatus, OutreachLead } from "@/lib/outreach/types";
import { LEAD_STATUS_LABELS } from "@/lib/outreach/types";
import type { LeadOverview } from "@/lib/outreach/team";
import { maskEmail, maskPhone } from "@/lib/outreach/access";
import { prettyPhone } from "@/admin/outreach/ui";
import { useCrmData } from "./useCrmData";
import { useOpenLead } from "./nav";
import { StatusDot } from "./ui";
import { cn } from "@/lib/utils";

/** Lead search over name, contact name, phone, email and city. Pure, for tests. */
export function searchLeads(leads: OutreachLead[], q: string, limit = 8): OutreachLead[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  const digits = n.replace(/\D/g, "");
  const scored: { l: OutreachLead; s: number }[] = [];
  for (const l of leads) {
    const name = (l.instituteName || "").toLowerCase();
    let s = 0;
    if (name.startsWith(n)) s = 4;
    else if (name.includes(n)) s = 3;
    else if ((l.contactName || "").toLowerCase().includes(n)) s = 2;
    else if ((l.email || "").toLowerCase().includes(n)) s = 2;
    else if ((l.city || "").toLowerCase().includes(n)) s = 1;
    else if (digits.length >= 3 && `${l.phone || ""} ${l.whatsapp || ""}`.replace(/\D/g, "").includes(digits)) s = 2;
    if (s) scored.push({ l, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.l.instituteName.localeCompare(b.l.instituteName)).slice(0, limit).map((x) => x.l);
}

/** The same search over leads without contacts (See all's overview rows): name and city only. Pure. */
export function searchOverview(rows: LeadOverview[], q: string, limit = 8): LeadOverview[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  const scored: { r: LeadOverview; s: number }[] = [];
  for (const r of rows) {
    const name = (r.instituteName || "").toLowerCase();
    const s = name.startsWith(n) ? 4 : name.includes(n) ? 3 : (r.city || "").toLowerCase().includes(n) ? 1 : 0;
    if (s) scored.push({ r, s });
  }
  return scored.sort((a, b) => b.s - a.s || a.r.instituteName.localeCompare(b.r.instituteName)).slice(0, limit).map((x) => x.r);
}

/** One line of the results: a lead the person reads in full, or (See all) one they only see. */
interface Hit {
  id: string;
  instituteName: string;
  status: LeadStatus;
  /** City, then the number or e-mail: masked for a member (spec 10.4); "Bilal's" for a lead they only see. */
  detail: string;
  readOnly: boolean;
}

/**
 * The top bar's search. "/" or Ctrl/Cmd+K focuses it from anywhere; arrows
 * move, Enter opens the lead, Escape clears.
 *
 * Since the team (spec 10.1, 10.4) it searches what the person reads: Mehdi
 * and admins every lead, as before; a member their own leads, with numbers
 * and e-mails masked in the list (the lead page shows them in full, and logs
 * it), and with See all the other leads too, by name and city only, marked
 * with whose they are.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const { leads, overview, isMember, me, nameOf } = useCrmData();
  const openLead = useOpenLead();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo((): Hit[] => {
    const own = searchLeads(leads, q).map((l): Hit => {
      const contact = l.phone ? (isMember ? maskPhone(l.phone) : prettyPhone(l.phone)) : isMember ? maskEmail(l.email) : l.email;
      return { id: l.id, instituteName: l.instituteName, status: l.status, detail: [l.city, contact].filter(Boolean).join(" · "), readOnly: false };
    });
    if (!isMember || !me.viewAll || own.length >= 8) return own;
    const mineIds = new Set(leads.map((l) => l.id));
    const others = searchOverview(overview.filter((r) => !mineIds.has(r.id)), q, 8 - own.length).map((r): Hit => {
      const whose = r.assigneeId ? `${r.assigneeName || nameOf(r.assigneeId)}'s` : "Unassigned";
      return { id: r.id, instituteName: r.instituteName, status: r.status, detail: [r.city, whose].filter(Boolean).join(" · "), readOnly: true };
    });
    return [...own, ...others];
  }, [leads, overview, q, isMember, me.viewAll, nameOf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setActive(0), [q]);

  const go = (h: Hit) => {
    openLead(h.id);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setQ("");
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const show = open && q.trim().length > 0;
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={show}
        aria-controls="crm-search-results"
        aria-activedescendant={show && results[active] ? `crm-sr-${results[active].id}` : undefined}
        aria-label={isMember ? "Search your leads by name, phone, email or city" : "Search leads by name, phone, email or city"}
        placeholder={isMember ? "Search my leads" : "Search leads"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-12 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-muted-foreground sm:block">Ctrl K</kbd>
      {show && (
        <ul
          id="crm-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-[13px] text-muted-foreground">No lead matches "{q.trim()}".</li>}
          {results.map((h, i) => (
            <li
              key={h.id}
              id={`crm-sr-${h.id}`}
              role="option"
              aria-selected={i === active}
              data-read-only={h.readOnly || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px]", i === active && "bg-muted")}
            >
              <StatusDot status={h.status} />
              <span className="min-w-0 flex-1 truncate font-medium">{h.instituteName}</span>
              <span className={cn("hidden truncate text-muted-foreground sm:inline", h.readOnly && "italic")} data-detail>{h.detail}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{LEAD_STATUS_LABELS[h.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
