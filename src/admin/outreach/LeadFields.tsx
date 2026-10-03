import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { LeadInput, OutreachLead } from "@/lib/outreach/types";
import type { DuplicateMatch } from "@/lib/outreach/team";
import { normalizeEmail, normalizePhone } from "@/lib/outreach/store";
import { useOutreach } from "./useOutreach";
import { looksDental } from "@/lib/demo/templates/dentalPick";
import { Field, KIND_LABEL, LEAD_KINDS, inputCls } from "./ui";
import { cn } from "@/lib/utils";

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
 * WhatsApp or email matches another lead anywhere in the team (whose it is;
 * "Open it" only when the caller may open it), without showing that lead's
 * contacts.
 *
 * A MEMBER'S EDIT (spec 10.7): `locked` names the fields they may not change
 * (the institute's name and kind, and every contact field that is already
 * filled); each shows as it is, with "Wrong? Ask Mehdi" (`onAskMehdi`). An
 * empty one can be filled. The database refuses the rest anyway.
 */
export function LeadFields({
  value,
  onChange,
  excludeId,
  onOpenDuplicate,
  tried,
  locked,
  onAskMehdi,
}: {
  value: LeadDraft;
  onChange: (v: LeadDraft) => void;
  excludeId?: string;
  onOpenDuplicate?: (id: string) => void;
  tried?: boolean;
  /** Fields shown read-only (a member's edit). */
  locked?: ReadonlySet<string>;
  /** "Wrong? Ask Mehdi" next to a locked field: what is wrong ("the phone number"). */
  onAskMehdi?: (what: string) => void;
}) {
  const { findDuplicate, me } = useOutreach();
  const [dup, setDup] = useState<DuplicateMatch | null>(null);
  const set = <K extends keyof LeadDraft>(k: K, v: LeadDraft[K]) => onChange({ ...value, [k]: v });
  const waSame = value.waSame !== false;
  const lock = (k: string) => Boolean(locked?.has(k));
  const ro = (k: string) => (lock(k) ? { readOnly: true, "aria-readonly": true as const } : {});
  const roCls = (k: string) => cn(inputCls, lock(k) && "bg-muted/50 text-muted-foreground");
  const ask = (k: string, what: string) =>
    lock(k) && onAskMehdi ? (
      <button type="button" className="text-primary underline underline-offset-2" data-testid={`ask-wrong-${k}`} onClick={() => onAskMehdi(what)}>
        Wrong? Ask Mehdi
      </button>
    ) : undefined;

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      // A locked (already filled) field is not looked up again: for a member each lookup counts against the day.
      const phone = locked?.has("phone") ? "" : value.phone || "";
      const wa = waSame || locked?.has("whatsapp") ? "" : value.whatsapp || "";
      const email = locked?.has("email") ? "" : value.email || "";
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
  }, [value.phone, value.whatsapp, value.email, waSame, excludeId, findDuplicate, locked]);

  const suggestSite = !value.website ? websiteFromEmail(value.email) : null;
  const nameMissing = tried && !value.instituteName?.trim();
  const contactMissing = tried && !value.phone?.trim() && !value.email?.trim() && !value.whatsapp?.trim();
  const dental = value.kind === "dental";
  // "Example Dental Clinic" typed while the kind is still School: offer the right kind, never switch it silently.
  const suggestDental = !dental && looksDental(value.instituteName);

  return (
    <div className="space-y-4">
      <Field id="lf-name" label={dental ? "Clinic name" : "Institute name"} hint={ask("instituteName", "the name")}>
        <input id="lf-name" className={roCls("instituteName")} {...ro("instituteName")} value={value.instituteName} onChange={(e) => set("instituteName", e.target.value)} placeholder={dental ? "Clinic name, as they spell it" : "As they spell it"} aria-invalid={nameMissing || undefined} />
      </Field>
      {nameMissing && <p className="-mt-2 text-xs text-destructive">Type the {dental ? "clinic's" : "institute's"} name.</p>}

      <fieldset>
        <legend className="text-sm font-medium">Kind</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="lf-kind">
          {LEAD_KINDS.map((k) => (
            <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm ${value.kind === k ? "border-primary bg-primary/10 font-medium text-primary" : "border-border"}`}>
              <input type="radio" name="lf-kind" value={k} className="sr-only" checked={value.kind === k} disabled={lock("kind") && value.kind !== k} onChange={() => set("kind", k)} />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
        {suggestDental && !lock("kind") && (
          <p className="mt-1.5 text-xs text-muted-foreground" data-testid="lf-kind-hint">
            The name sounds like a dental clinic.{" "}
            <button type="button" className="text-primary underline underline-offset-2" onClick={() => set("kind", "dental")}>
              Set kind to Dental clinic
            </button>
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lf-contact" label="Contact name (optional)" hint={ask("contactName", "the contact name")}>
          <input id="lf-contact" className={roCls("contactName")} {...ro("contactName")} value={value.contactName || ""} onChange={(e) => set("contactName", e.target.value)} placeholder={dental ? "Doctor or clinic manager" : "Principal or director"} />
        </Field>
        <Field id="lf-city" label="City" hint={ask("city", "the city")}>
          <input id="lf-city" className={roCls("city")} {...ro("city")} value={value.city || ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field id="lf-phone" label="Phone" hint={ask("phone", "the phone number")}>
          <input id="lf-phone" type="tel" inputMode="tel" className={roCls("phone")} {...ro("phone")} value={value.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="98100 12345" />
        </Field>
        <Field id="lf-email" label="Email" hint={ask("email", "the e-mail address")}>
          <input id="lf-email" type="email" inputMode="email" className={roCls("email")} {...ro("email")} value={value.email || ""} onChange={(e) => set("email", e.target.value)} placeholder={dental ? "clinic@example.com" : "office@example.com"} />
        </Field>
      </div>

      <div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={waSame} disabled={lock("whatsapp")} onChange={(e) => onChange({ ...value, waSame: e.target.checked, whatsapp: e.target.checked ? "" : value.whatsapp })} />
          WhatsApp is on the same number
        </label>
        {!waSame && (
          <Field id="lf-wa" label="WhatsApp number" hint={ask("whatsapp", "the WhatsApp number")}>
            <input id="lf-wa" type="tel" inputMode="tel" className={roCls("whatsapp")} {...ro("whatsapp")} value={value.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
        )}
      </div>
      {contactMissing && <p className="-mt-2 text-xs text-destructive">Add a phone or an email, so there is someone to message.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="lf-site" label="Website (optional)" hint={lock("website") ? ask("website", "the website") : suggestSite ? (
          <button type="button" className="text-primary underline underline-offset-2" onClick={() => set("website", suggestSite)}>
            Use {suggestSite} (from the email)
          </button>
        ) : undefined}>
          <input id="lf-site" type="url" inputMode="url" className={roCls("website")} {...ro("website")} value={value.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
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
          <span className="min-w-0 flex-1" data-testid="lf-duplicate">
            Already a lead: <strong>{dup.instituteName}</strong>
            {dup.visible && dup.city ? `, ${dup.city}` : ""} has the same{" "}
            {dup.visible ? (dup.email && normalizeEmail(value.email) === dup.email ? "email" : "number") : "number or email"}.
            {!me.legacy && (dup.visible && dup.assigneeId && dup.assigneeId === me.memberId
              ? " It is yours."
              : dup.assigneeName === "Unassigned" ? " It is in the Unassigned pool." : dup.assigneeName ? ` It is ${dup.assigneeName}'s.` : "")}
            {!dup.visible && " Ask Mehdi before you use it."}
          </span>
          {onOpenDuplicate && dup.visible && (
            <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => onOpenDuplicate(dup.leadId || dup.id)}>
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

/** The fields the edit form shows. */
const EDITED_KEYS = ["instituteName", "kind", "contactName", "phone", "whatsapp", "email", "website", "city", "state", "language"] as const;

/** A value as the store would keep it, for "did it change?": numbers and e-mails normalised, text trimmed. */
function kept(key: string, v: unknown): unknown {
  if (v === undefined || v === null) return "";
  if (key === "phone" || key === "whatsapp") return normalizePhone(String(v)) || "";
  if (key === "email") return normalizeEmail(String(v)) || "";
  return typeof v === "string" ? v.trim() : v;
}

/**
 * What an edit changed, as a patch (spec 9.3: only the changed keys travel and
 * are merged on the server, so two people never overwrite each other). A
 * field emptied is removed. A member's patch then holds only fields that were
 * empty before (the database refuses anything else).
 */
export function changedFields(lead: OutreachLead, edited: LeadInput): Partial<OutreachLead> {
  const out: Record<string, unknown> = {};
  const before = lead as unknown as Record<string, unknown>;
  const after = edited as unknown as Record<string, unknown>;
  for (const k of EDITED_KEYS) {
    if (!(k in after)) continue;
    if (kept(k, before[k]) === kept(k, after[k])) continue;
    out[k] = kept(k, after[k]) === "" ? undefined : after[k];
  }
  return out as Partial<OutreachLead>;
}
