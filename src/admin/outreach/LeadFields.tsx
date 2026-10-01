import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { LeadInput, OutreachLead } from "@/lib/outreach/types";
import { normalizePhone } from "@/lib/outreach/store";
import { useOutreach } from "./useOutreach";
import { looksDental } from "@/lib/demo/templates/dentalPick";
import { Field, KIND_LABEL, LEAD_KINDS, inputCls } from "./ui";

/** Free mail domains: an address here says nothing about the institute's website. */
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|rediffmail|hotmail|outlook|live|icloud|aol|protonmail|zoho|proton)\./i;

/** "office@sunrisepublic.in" suggests https://sunrisepublic.in. Null for Gmail and friends. */
export function websiteFromEmail(email?: string): string | null {
  const m = /@([a-z0-9.-]+\.[a-z]{2,})$/i.exec((email || "").trim());
  if (!m || FREE_MAIL.test(m[1])) return null;
  return `https://${m[1].toLowerCase()}`;
}

export type LeadDraft = LeadInput & { waSame?: boolean };

/**
 * The lead's fields, shared by New lead and Edit. Warns the moment the phone,
 * WhatsApp or email matches another lead, with a link to open that one.
 */
export function LeadFields({
  value,
  onChange,
  excludeId,
  onOpenDuplicate,
  tried,
}: {
  value: LeadDraft;
  onChange: (v: LeadDraft) => void;
  excludeId?: string;
  onOpenDuplicate?: (id: string) => void;
  tried?: boolean;
}) {
  const { findDuplicate } = useOutreach();
  const [dup, setDup] = useState<OutreachLead | null>(null);
  const set = <K extends keyof LeadDraft>(k: K, v: LeadDraft[K]) => onChange({ ...value, [k]: v });
  const waSame = value.waSame !== false;

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      const phone = value.phone || "";
      const wa = waSame ? "" : value.whatsapp || "";
      const email = value.email || "";
      if (!normalizePhone(phone) && !normalizePhone(wa) && !email.includes("@")) {
        if (alive) setDup(null);
        return;
      }
      try {
        let hit = await findDuplicate({ phone, email, excludeId });
        if (!hit && wa) hit = await findDuplicate({ phone: wa, excludeId });
        if (alive) setDup(hit);
      } catch {
        if (alive) setDup(null);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [value.phone, value.whatsapp, value.email, waSame, excludeId, findDuplicate]);

  const suggestSite = !value.website ? websiteFromEmail(value.email) : null;
  const nameMissing = tried && !value.instituteName?.trim();
  const contactMissing = tried && !value.phone?.trim() && !value.email?.trim() && !value.whatsapp?.trim();
  const dental = value.kind === "dental";
  // "Example Dental Clinic" typed while the kind is still School: offer the right kind, never switch it silently.
  const suggestDental = !dental && looksDental(value.instituteName);

  return (
    <div className="space-y-4">
      <Field id="lf-name" label={dental ? "Clinic name" : "Institute name"}>
        <input id="lf-name" className={inputCls} value={value.instituteName} onChange={(e) => set("instituteName", e.target.value)} placeholder={dental ? "Clinic name, as they spell it" : "As they spell it"} aria-invalid={nameMissing || undefined} />
      </Field>
      {nameMissing && <p className="-mt-2 text-xs text-destructive">Type the {dental ? "clinic's" : "institute's"} name.</p>}

      <fieldset>
        <legend className="text-sm font-medium">Kind</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="lf-kind">
          {LEAD_KINDS.map((k) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm ${value.kind === k ? "border-primary bg-primary/10 font-medium text-primary" : "border-border"}`}>
              <input type="radio" name="lf-kind" value={k} className="sr-only" checked={value.kind === k} onChange={() => set("kind", k)} />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
        {suggestDental && (
          <p className="mt-1.5 text-xs text-muted-foreground" data-testid="lf-kind-hint">
            The name sounds like a dental clinic.{" "}
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => set("kind", "dental")}>
              Set kind to Dental clinic
            </button>
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lf-contact" label="Contact name (optional)">
          <input id="lf-contact" className={inputCls} value={value.contactName || ""} onChange={(e) => set("contactName", e.target.value)} placeholder={dental ? "Doctor or clinic manager" : "Principal or director"} />
        </Field>
        <Field id="lf-city" label="City">
          <input id="lf-city" className={inputCls} value={value.city || ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field id="lf-phone" label="Phone">
          <input id="lf-phone" type="tel" inputMode="tel" className={inputCls} value={value.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="98100 12345" />
        </Field>
        <Field id="lf-email" label="Email">
          <input id="lf-email" type="email" inputMode="email" className={inputCls} value={value.email || ""} onChange={(e) => set("email", e.target.value)} placeholder={dental ? "clinic@example.com" : "office@example.com"} />
        </Field>
      </div>

      <div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={waSame} onChange={(e) => onChange({ ...value, waSame: e.target.checked, whatsapp: e.target.checked ? "" : value.whatsapp })} />
          WhatsApp is on the same number
        </label>
        {!waSame && (
          <Field id="lf-wa" label="WhatsApp number">
            <input id="lf-wa" type="tel" inputMode="tel" className={inputCls} value={value.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
        )}
      </div>
      {contactMissing && <p className="-mt-2 text-xs text-destructive">Add a phone or an email, so there is someone to message.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lf-site" label="Website (optional)" hint={suggestSite ? (
          <button type="button" className="text-primary underline underline-offset-2" onClick={() => set("website", suggestSite)}>
            Use {suggestSite} (from the email)
          </button>
        ) : undefined}>
          <input id="lf-site" type="url" inputMode="url" className={inputCls} value={value.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
        </Field>
        <Field id="lf-lang" label="Message language">
          <select id="lf-lang" className={inputCls} value={value.language || "en"} onChange={(e) => set("language", e.target.value as LeadDraft["language"])}>
            <option value="en">English</option>
            <option value="hinglish">Hinglish</option>
            <option value="hi">Hindi</option>
          </select>
        </Field>
      </div>

      {dup && (
        <div role="alert" className="flex flex-wrap items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            Already a lead: <strong>{dup.instituteName}</strong>
            {dup.city ? `, ${dup.city}` : ""} has the same {dup.email && value.email && dup.email === value.email.trim().toLowerCase() ? "email" : "number"}.
          </span>
          {onOpenDuplicate && (
            <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => onOpenDuplicate(dup.id)}>
              Open it
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Draft to the lead the store saves: WhatsApp copies the phone when "same". */
export function draftToLead(d: LeadDraft): LeadInput {
  const { waSame, ...rest } = d;
  const out: LeadInput = { ...rest, instituteName: (rest.instituteName || "").trim() };
  if (waSame !== false) out.whatsapp = rest.phone || "";
  return out;
}
