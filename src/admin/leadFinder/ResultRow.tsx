import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, MapPin, Phone, Plus, Sparkles, Star } from "lucide-react";
import type { FinderPlace } from "@/lib/leadFinder/client";
import type { OutreachLead } from "@/lib/outreach/types";
import { normalizePhone } from "@/lib/outreach/store";
import { cn } from "@/lib/utils";
import { WebsiteBadge, type AuditState } from "./WebsiteBadge";
import { btn, btnPrimary } from "./styles";

/** Row columns at lg and up; below lg the row is a stacked card. */
export const ROW_GRID = "lg:grid lg:grid-cols-[1.75rem_minmax(0,2fr)_6.5rem_9.5rem_minmax(0,1.3fr)_13rem] lg:items-start lg:gap-3";

export interface RowProps {
  place: FinderPlace;
  audit: AuditState;
  existing?: OutreachLead;
  selected: boolean;
  /** Which action is running on this row, if any. */
  busy: "add" | "demo" | "phone" | "save" | null;
  /** The template "Add + create demo" would use, e.g. "c1 JEE/NEET urban". Null: none fits. */
  templateLabel: string | null;
  error?: string;
  onToggle: () => void;
  onAdd: () => void;
  onAddDemo: () => void;
  onGetPhone: () => void;
  onSavePhone: () => void;
}

export function ResultRow(p: RowProps) {
  const { place, existing } = p;
  const phone = place.phone || place.phoneIntl;
  const tel = normalizePhone(place.phoneIntl || place.phone);
  const phoneSaved = !!existing && !!tel
    && ([existing.phone, existing.whatsapp].some((x) => normalizePhone(x) === tel) || (existing.notes || "").includes(tel));
  const closed = place.businessStatus && place.businessStatus !== "OPERATIONAL";
  const anyBusy = p.busy !== null;
  const cellLabel = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden";

  return (
    <li
      aria-label={place.name}
      data-place-id={place.placeId}
      className={cn("rounded-2xl border bg-card/60 p-4 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-3 lg:py-3", ROW_GRID,
        p.selected ? "border-primary/60 lg:bg-primary/5" : "border-border")}
    >
      <div className="float-right ml-3 lg:float-none lg:ml-0 lg:pt-0.5">
        <input type="checkbox" checked={p.selected} onChange={p.onToggle} disabled={!!existing}
          aria-label={`Select ${place.name}`} className="h-4 w-4 accent-[hsl(var(--primary))]" />
      </div>

      <div className="min-w-0">
        <p className="break-words font-medium leading-snug">{place.name}</p>
        {existing && (
          <Link to="/admin/outreach" className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:underline">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Already in Outreach
          </Link>
        )}
        {closed && <span className="ml-1 mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{place.businessStatus === "CLOSED_PERMANENTLY" ? "Closed" : "Temporarily closed"}</span>}
        {place.address && <p className="mt-1 break-words text-xs text-muted-foreground">{place.address}</p>}
        {place.mapsUrl && (
          <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <MapPin className="h-3 w-3" aria-hidden="true" /> Google Maps <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="mt-3 lg:mt-0">
        <p className={cellLabel}>Rating</p>
        {place.rating !== null ? (
          <p className="inline-flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-current text-warning" aria-hidden="true" />
            {place.rating.toFixed(1)}
            <span className="text-xs text-muted-foreground">({place.ratingCount ?? 0})</span>
          </p>
        ) : <p className="text-xs text-muted-foreground">No reviews</p>}
      </div>

      <div className="mt-3 min-w-0 lg:mt-0">
        <p className={cellLabel}>Phone (Google, live)</p>
        {phone ? (
          <a href={`tel:${tel || phone}`} className="inline-flex items-center gap-1 whitespace-nowrap text-sm hover:underline">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> {phone}
          </a>
        ) : (
          <button type="button" onClick={p.onGetPhone} disabled={anyBusy} className={cn(btn, "h-8")}>
            {p.busy === "phone" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Get phone from Google
          </button>
        )}
        {existing && phone && !phoneSaved && (
          <button type="button" onClick={p.onSavePhone} disabled={anyBusy} title="Copies Google's number into the lead. Your choice: Google's terms allow keeping only the place ID otherwise."
            className="mt-1 block text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50">
            {p.busy === "save" ? "Saving..." : "Save this number"}
          </button>
        )}
        {existing && phoneSaved && <p className="mt-1 text-[11px] text-muted-foreground">Saved on the lead</p>}
      </div>

      <div className="mt-3 min-w-0 lg:mt-0">
        <p className={cellLabel}>Website</p>
        <WebsiteBadge st={p.audit} />
        {place.website && (
          <a href={place.website} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-muted-foreground hover:text-primary hover:underline" title={place.website}>
            {place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 lg:mt-0 lg:justify-end">
        {!existing && (
          <button type="button" onClick={p.onAdd} disabled={anyBusy} className={btn}>
            {p.busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            Add to Outreach
          </button>
        )}
        {!existing?.demoId && p.templateLabel && (
          <button type="button" onClick={p.onAddDemo} disabled={anyBusy} className={btnPrimary} title={`Demo from template ${p.templateLabel}`}>
            {p.busy === "demo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
            {existing ? "Create demo" : "Add + create demo"}
          </button>
        )}
        {existing?.demoId && (
          <Link to={`/admin/c/demoSites?edit=${encodeURIComponent(existing.demoId)}`} className={btn}>Open demo</Link>
        )}
        {p.templateLabel && !existing?.demoId && <p className="w-full text-[11px] text-muted-foreground lg:text-right">Template: {p.templateLabel}</p>}
      </div>
      {p.error && <p role="alert" className="mt-2 text-xs text-destructive lg:col-span-6">{p.error}</p>}
    </li>
  );
}
