import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/outreach/types";
import { useOutreach } from "./useOutreach";
import { LeadRow } from "./LeadRow";
import { inputCls } from "./ui";

type Sort = "next" | "updated" | "created" | "name";

const selectCls =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary sm:text-sm";

/** Every lead, with search, three filters and a sort. */
export function LeadsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { leads } = useOutreach();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | LeadStatus | "open">("open");
  const [kind, setKind] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<Sort>("next");

  const cities = useMemo(
    () => [...new Set(leads.map((l) => (l.city || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [leads],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const list = leads.filter((l) => {
      if (status === "open" && ["won", "lost", "do_not_contact"].includes(l.status)) return false;
      if (status && status !== "open" && l.status !== status) return false;
      if (kind && l.kind !== kind) return false;
      if (city && (l.city || "").trim() !== city) return false;
      if (!needle) return true;
      const hay = [l.instituteName, l.contactName, l.email, l.city, l.website, l.notes, ...(l.tags || [])].join(" ").toLowerCase();
      if (hay.includes(needle)) return true;
      if (digits.length >= 4 && [l.phone, l.whatsapp].some((p) => (p || "").replace(/\D/g, "").includes(digits))) return true;
      return false;
    });
    const t = (s?: string) => (s ? new Date(s).getTime() : 0);
    return list.sort((a, b) => {
      if (sort === "name") return a.instituteName.localeCompare(b.instituteName);
      if (sort === "created") return t(b.createdAt) - t(a.createdAt);
      if (sort === "updated") return t(b.updatedAt) - t(a.updatedAt);
      // next action: dated first (soonest first), then undated newest first
      const an = t(a.nextActionAt) || Infinity;
      const bn = t(b.nextActionAt) || Infinity;
      if (an !== bn) return an - bn;
      return t(b.updatedAt) - t(a.updatedAt);
    });
  }, [leads, q, status, kind, city, sort]);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-5">
          <label htmlFor="lead-search" className="sr-only">Search leads</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 mt-[3px] h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id="lead-search" className={inputCls + " pl-9"} placeholder="Name, phone, email, city, note" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="open">Open leads</option>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select aria-label="Kind" className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Schools and coaching</option>
          <option value="school">Schools</option>
          <option value="coaching">Coaching</option>
          <option value="other">Other</option>
        </select>
        <select aria-label="City" className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Sort" className={selectCls + " lg:col-span-2"} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="next">Sort: next follow-up</option>
          <option value="updated">Sort: recently changed</option>
          <option value="created">Sort: newest added</option>
          <option value="name">Sort: name A to Z</option>
        </select>
      </div>

      <p className="mb-2 mt-4 text-sm text-muted-foreground">
        {shown.length} of {leads.length} {leads.length === 1 ? "lead" : "leads"}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {leads.length ? "No lead matches these filters." : "No leads yet. Tap New lead, or paste a list under Import."}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="lead-list">
          {shown.map((l) => (
            <LeadRow key={l.id} lead={l} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </div>
  );
}
