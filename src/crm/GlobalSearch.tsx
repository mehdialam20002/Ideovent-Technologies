import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { OutreachLead } from "@/lib/outreach/types";
import { LEAD_STATUS_LABELS } from "@/lib/outreach/types";
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

/**
 * The top bar's search. "/" or Ctrl/Cmd+K focuses it from anywhere; arrows
 * move, Enter opens the lead, Escape clears.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const { leads } = useCrmData();
  const openLead = useOpenLead();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchLeads(leads, q), [leads, q]);

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

  const go = (l: OutreachLead) => {
    openLead(l.id);
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
        aria-label="Search leads by name, phone, email or city"
        placeholder="Search leads"
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
          {results.map((l, i) => (
            <li
              key={l.id}
              id={`crm-sr-${l.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(l)}
              className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px]", i === active && "bg-muted")}
            >
              <StatusDot status={l.status} />
              <span className="min-w-0 flex-1 truncate font-medium">{l.instituteName}</span>
              <span className="hidden truncate text-muted-foreground sm:inline">
                {[l.city, l.phone ? prettyPhone(l.phone) : l.email].filter(Boolean).join(" · ")}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{LEAD_STATUS_LABELS[l.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
