/**
 * THE THREE STEPS AND THE CONFIRMATION of the booking flow. State lives in
 * BookingFlow.tsx; these draw it. Each step opens with an h2 the flow moves
 * focus to, and every error sits under its own field (DENTAL-DESIGN.md s7).
 */

import type { ReactNode, RefObject } from "react";
import { AlertTriangle, CalendarPlus, CheckCircle2, Info, MessageCircle, RotateCcw } from "lucide-react";
import type { DentalBranch, DentalDoctor, DentalReason } from "@/lib/cms/types";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { branchSlug, doctorSlug, useSite } from "@/lib/demo/site/context";
import { SiteLink } from "@/pages/site/kit/motion";
import { CallLink } from "./actions";
import { useBooking } from "./booking";
import { BOOKING_COPY } from "./copy";
import { BOOKING_MORE } from "./bookingCopy";
import type { BookingDay } from "./bookingLogic";
import type { BookingErrors } from "./BookingFlow";
import { Chip, DateStrip, FieldError, inputCls, onRadioKeys, Progress, SlotGroup } from "./bookingParts";
import { DentalGlyph } from "./icons";
import { dentalContact } from "./logic";

type HRef = RefObject<HTMLHeadingElement>;

function StepHead({ n, title, headingRef, picked, onEdit, onJump }: { n: number; title: string; headingRef: HRef; picked?: string; onEdit?: () => void; onJump?: (n: number) => void }) {
  const { lang } = useSite();
  return (
    <div className="pr-10 sm:pr-8">
      <Progress step={n} onJump={onJump || (() => onEdit?.())} />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--ds-accent))]">{trf(BOOKING_COPY.step, lang, { n: String(n) })}</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-[1.45rem] font-semibold leading-snug tracking-[-0.01em] outline-none [font-family:var(--ds-display)]">{title}</h2>
      {picked && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-[hsl(var(--ds-ink-soft))]">
          <span>{picked}</span>
          {onEdit && <button type="button" onClick={onEdit} className="min-h-11 font-semibold text-[hsl(var(--ds-accent))] underline underline-offset-4">{tr(BOOKING_MORE.edit, lang)}</button>}
        </p>
      )}
    </div>
  );
}

function GroupLabel({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="text-sm font-semibold text-[hsl(var(--ds-ink))]">{children}</p>;
}

/** Doctor or branch: chips up to five options, a select beyond that. */
function Choice({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string; photo?: string }[];
}) {
  if (options.length > 6) {
    return (
      <label className="block text-sm font-semibold">{label}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.sub ? `${o.label}, ${o.sub}` : o.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <div>
      <GroupLabel id={id}>{label}</GroupLabel>
      <div role="radiogroup" aria-labelledby={id} onKeyDown={onRadioKeys} className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <Chip key={o.value} selected={value === o.value} onSelect={() => onChange(o.value)}>
            {o.photo ? <img src={o.photo} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : null}
            <span className="min-w-0">
              <span className="block truncate">{o.label}</span>
              {o.sub && <span className="block truncate text-xs font-normal text-[hsl(var(--ds-ink-soft))]">{o.sub}</span>}
            </span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function BookingStepOne({ uid, headingRef, reasons, reason, setReason, doctors, doctor, setDoctor, branches, branch, setBranch, error }: {
  uid: string; headingRef: HRef;
  reasons: DentalReason[]; reason: string; setReason: (r: string) => void;
  doctors: DentalDoctor[]; doctor: string; setDoctor: (d: string) => void;
  branches: DentalBranch[]; branch: string; setBranch: (b: string) => void;
  error?: string;
}) {
  const { lang } = useSite();
  const urgent = reasons.find((r) => r.id === reason)?.urgent;
  const sorted = [...reasons].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <StepHead n={1} title={tr(BOOKING_COPY.whatTitle, lang)} headingRef={headingRef} />
      <div>
        <GroupLabel id={`${uid}-rl`}>{tr(BOOKING_MORE.reasonLegend, lang)}</GroupLabel>
        <div id={`${uid}-reason`} tabIndex={-1} role="radiogroup" aria-labelledby={`${uid}-rl`} aria-describedby={`${uid}-reason-err`} aria-invalid={error ? true : undefined}
          onKeyDown={onRadioKeys} className="mt-2 grid grid-cols-2 gap-2 outline-none">
          {sorted.map((r, i) => (
            <Chip key={r.id} selected={reason === r.id} onSelect={() => setReason(r.id)} urgent={r.urgent}
              tabbable={!reason && i === 0} className="min-h-[56px]">
              <DentalGlyph name={r.icon} className={`h-5 w-5 shrink-0 ${r.urgent ? "text-[#B42318]" : "text-[hsl(var(--ds-accent))]"}`} />
              <span>{bi(r, "label", lang)}</span>
            </Chip>
          ))}
        </div>
        <FieldError id={`${uid}-reason-err`} text={error} />
        {urgent && (
          <div className="mt-3 rounded-[calc(var(--ds-radius)*0.7)] border-l-4 border-[#B42318] bg-[hsl(var(--ds-surface-2))] p-3.5 text-sm">
            <p className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B42318]" aria-hidden="true" />{tr(BOOKING_MORE.urgent, lang)}</p>
            <CallLink emergency className="ml-6 text-[hsl(var(--ds-ink))] underline underline-offset-4" />
          </div>
        )}
      </div>
      {branches.length > 1 && (
        <Choice id={`${uid}-bl`} label={tr(BOOKING_COPY.branch, lang)} value={branch} onChange={setBranch}
          options={[{ value: "", label: tr(BOOKING_MORE.anyBranch, lang) }, ...branches.map((b) => ({ value: branchSlug(b), label: bi(b, "name", lang), sub: bi(b, "city", lang) }))]} />
      )}
      {doctors.length > 1 && (
        <Choice id={`${uid}-dl`} label={tr(BOOKING_COPY.doctor, lang)} value={doctor} onChange={setDoctor}
          options={[{ value: "", label: tr(BOOKING_COPY.anyDoctor, lang) }, ...doctors.map((x) => ({ value: doctorSlug(x), label: bi(x, "name", lang), sub: bi(x, "specialisation", lang), photo: x.photo }))]} />
      )}
    </div>
  );
}

export function BookingStepTwo({ uid, headingRef, days, day, setDay, morning, evening, slot, setSlot, isPast, closedNote, closedLine, errors, picked, onEdit }: {
  uid: string; headingRef: HRef;
  days: BookingDay[]; day: string; setDay: (d: string) => void;
  morning: string[]; evening: string[]; slot: string; setSlot: (s: string) => void; isPast: (s: string) => boolean;
  closedNote: string; closedLine: string; errors: BookingErrors; picked: string; onEdit: () => void;
}) {
  const { site, lang } = useSite();
  const allGone = !!day && [...morning, ...evening].every(isPast);
  const emergencyTel = dentalContact(site).emergencyTel;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <StepHead n={2} title={tr(BOOKING_COPY.whenTitle, lang)} headingRef={headingRef} picked={picked} onEdit={onEdit} onJump={() => onEdit()} />
      <div>
        <GroupLabel id={`${uid}-dayl`}>{tr(BOOKING_MORE.dayLegend, lang)}</GroupLabel>
        <div id={`${uid}-day`} tabIndex={-1} className="mt-2 outline-none">
          <DateStrip days={days} value={day} onChange={setDay} closedNote={closedNote} labelId={`${uid}-dayl`} />
        </div>
        {closedLine && <p className="mt-1 text-xs text-[hsl(var(--ds-ink-soft))]">{closedLine}</p>}
        <FieldError id={`${uid}-day-err`} text={errors.day} />
      </div>
      <div id={`${uid}-slot`} tabIndex={-1} className="grid grid-cols-[minmax(0,1fr)] gap-5 outline-none" aria-describedby={`${uid}-slot-err`}>
        <GroupLabel id={`${uid}-sl`}>{tr(BOOKING_MORE.slotLegend, lang)}</GroupLabel>
        {allGone ? (
          <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_MORE.noSlotsToday, lang)}</p>
        ) : (
          <>
            <SlotGroup title={tr(BOOKING_COPY.morning, lang)} slots={morning} value={slot} onChange={setSlot} isPast={isPast} />
            <SlotGroup title={tr(BOOKING_COPY.evening, lang)} slots={evening} value={slot} onChange={setSlot} isPast={isPast} />
          </>
        )}
        <FieldError id={`${uid}-slot-err`} text={errors.slot} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-[hsl(var(--ds-ink-soft))]">
        <p className="flex items-center gap-1.5"><Info className="h-4 w-4 shrink-0" aria-hidden="true" />{tr(BOOKING_MORE.slotsNote, lang)}</p>
        {emergencyTel && <a href={emergencyTel} className="inline-flex min-h-11 items-center font-semibold text-[#B42318] underline underline-offset-4">{tr(BOOKING_COPY.emergencyCall, lang)}</a>}
      </div>
    </div>
  );
}

export function BookingStepThree({ uid, headingRef, errors, name, setName, mobile, setMobile, email, setEmail, reminders, setReminders, forChild, picked, onEdit }: {
  uid: string; headingRef: HRef; errors: BookingErrors;
  name: string; setName: (s: string) => void; mobile: string; setMobile: (s: string) => void;
  email: string; setEmail: (s: string) => void; reminders: boolean; setReminders: (b: boolean) => void;
  forChild: boolean; picked: string; onEdit: () => void;
}) {
  const { site, lang, href } = useSite();
  const { close } = useBooking();
  const privacy = href("privacy");
  const c = dentalContact(site);
  const err = (k: keyof BookingErrors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": `${uid}-${k}-err` });
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <StepHead n={3} title={tr(BOOKING_COPY.youTitle, lang)} headingRef={headingRef} picked={picked} onEdit={onEdit} onJump={() => onEdit()} />
      {forChild && <p className="rounded-[calc(var(--ds-radius)*0.7)] bg-[hsl(var(--ds-surface-2))] p-3 text-sm">{tr(BOOKING_COPY.child, lang)}</p>}
      <div>
        <label htmlFor={`${uid}-name`} className="text-sm font-semibold">{tr(BOOKING_COPY.name, lang)}</label>
        <input id={`${uid}-name`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} {...err("name")} />
        <FieldError id={`${uid}-name-err`} text={errors.name} />
      </div>
      <div>
        <label htmlFor={`${uid}-mobile`} className="text-sm font-semibold">{tr(BOOKING_COPY.mobile, lang)}</label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-base text-[hsl(var(--ds-ink-soft))]">+91</span>
          <input id={`${uid}-mobile`} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10})/, "").slice(0, 10))}
            className={`${inputCls} pl-12 tabular-nums tracking-wide`} aria-invalid={errors.mobile ? true : undefined} aria-describedby={`${uid}-mobile-hint ${uid}-mobile-err`} />
        </div>
        <p id={`${uid}-mobile-hint`} className="mt-1 text-xs text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_MORE.mobileHint, lang)}</p>
        <FieldError id={`${uid}-mobile-err`} text={errors.mobile} />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="text-sm font-semibold">{tr(BOOKING_COPY.email, lang)}</label>
        <input id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} {...err("email")} />
        <FieldError id={`${uid}-email-err`} text={errors.email} />
      </div>
      <p className="flex gap-2 text-sm text-[hsl(var(--ds-ink-soft))]"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{tr(BOOKING_COPY.noMedical, lang)}</p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--ds-cta))]" />
        <span>{tr(BOOKING_COPY.reminders, lang)}</span>
      </label>
      <div className="rounded-[calc(var(--ds-radius)*0.7)] border border-[hsl(var(--ds-line))] p-3.5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_MORE.privacyTitle, lang)}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[hsl(var(--ds-ink-soft))]">
          {trf(BOOKING_COPY.consent, lang, { clinic: site.instituteName, contact: c.email || c.phone || site.instituteName })}
          {privacy && <>{" "}<SiteLink to={privacy} onNavigate={close} className="font-semibold text-[hsl(var(--ds-ink))] underline underline-offset-2">{tr(BOOKING_MORE.privacyLink, lang)}</SiteLink>.</>}
        </p>
      </div>
    </div>
  );
}

/** The confirmation: summary, WhatsApp (or the demo notice), calendar, start again. */
export function BookingDone({ headingRef, wa, cal, rows, onAgain }: {
  headingRef: HRef; wa?: string; cal?: string; rows: [string, string][]; onAgain: () => void;
}) {
  const { site, lang } = useSite();
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--dn-btn-radius,var(--ds-radius))] px-5 text-[15px] font-semibold";
  return (
    <div className="dn-bk-step grid grid-cols-[minmax(0,1fr)] gap-5" aria-live="polite">
      <div className="pr-10 sm:pr-8">
        <CheckCircle2 className="h-9 w-9 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
        <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-[1.45rem] font-semibold leading-snug outline-none [font-family:var(--ds-display)]">{tr(BOOKING_COPY.doneTitle, lang)}</h2>
      </div>
      <div className="rounded-[calc(var(--ds-radius)*0.8)] bg-[hsl(var(--ds-surface-2))] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_MORE.summaryTitle, lang)}</p>
        <dl className="mt-3 grid gap-2 text-sm">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3"><dt className="text-[hsl(var(--ds-ink-soft))]">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </div>
      {wa ? (
        <div className="grid gap-3">
          <p className="text-sm">{trf(BOOKING_MORE.waOpened, lang, { clinic: site.instituteName })}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} dn-wa`}><MessageCircle className="h-4 w-4" aria-hidden="true" />{tr(BOOKING_MORE.waAgain, lang)}</a>
        </div>
      ) : (
        <div role="status" className="flex gap-3 rounded-[calc(var(--ds-radius)*0.8)] border border-[hsl(var(--ds-cta)/0.35)] bg-[hsl(var(--ds-cta)/0.06)] p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
          <div><p className="font-semibold">{tr(BOOKING_MORE.demoTitle, lang)}</p><p className="mt-1 text-sm">{tr(BOOKING_MORE.demoBody, lang)}</p></div>
        </div>
      )}
      <p className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_MORE.confirmNext, lang)}</p>
      <div className="flex flex-wrap gap-3">
        {cal && <a href={cal} download="appointment.ics" className={`${btn} border border-[hsl(var(--ds-line))]`}><CalendarPlus className="h-4 w-4" aria-hidden="true" />{tr(BOOKING_COPY.addToCalendar, lang)}</a>}
        <button type="button" onClick={onAgain} className={`${btn} text-[hsl(var(--ds-ink))] underline underline-offset-4`}><RotateCcw className="h-4 w-4" aria-hidden="true" />{tr(BOOKING_MORE.again, lang)}</button>
      </div>
      <p className="text-center text-xs text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_COPY.demoNote, lang)}</p>
    </div>
  );
}
