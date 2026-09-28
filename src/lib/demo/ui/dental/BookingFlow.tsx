/**
 * THE 3-STEP BOOKING FLOW, 4 fields before confirmation (DENTAL-DESIGN.md
 * section 7, DENTAL-COMPLIANCE.md section 5). 1 what and where (reason,
 * doctor, branch), 2 when (7-day strip, morning and evening slots), 3 you
 * (name, mobile, optional email, the DPDP consent line, the unticked
 * reminders box). The demo stores and sends nothing: on submit it opens
 * WhatsApp with the request written out when the clinic has a real number
 * (the patient still presses send), and otherwise shows the demo notice.
 * "Demo form. Nothing is sent." is always on screen.
 *
 * Used in the booking sheet (variant "sheet": the Back / Continue bar sticks
 * to the sheet's foot) and on /book (variant "page").
 * Pure helpers: ./bookingLogic.ts. Pieces: ./bookingParts.tsx.
 */

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { DentalReason } from "@/lib/cms/types";
import { bi, biList, tr, trf, withText } from "@/lib/demo/site/bilingual";
import { branchSlug, doctorSlug, useSite } from "@/lib/demo/site/context";
import { BOOKING_COPY, DENTAL_COPY } from "./copy";
import { BOOKING_MORE } from "./bookingCopy";
import { closedDaysOf, dayParts, icsHref, isPastSlot, isPlaceholderNumber, nextDays, validEmail, validMobile } from "./bookingLogic";
import { dentalContact, dentalOf, findTreatment, whatsappHref, type BookingPreset } from "./logic";
import "./booking.css";
import { BookingStepOne, BookingStepThree, BookingStepTwo, BookingDone } from "./bookingSteps";

/** Used when a record has no reasons of its own. */
export const DEFAULT_REASONS: DentalReason[] = [
  { id: "pain", label: "Tooth pain or swelling", icon: "pain", urgent: true, hi: { label: "दाँत में दर्द या सूजन" } },
  { id: "checkup", label: "Check-up and cleaning", icon: "checkup", hi: { label: "चेक-अप और सफ़ाई" } },
  { id: "root-canal", label: "Root canal", icon: "root-canal", hi: { label: "रूट कैनाल" } },
  { id: "implants", label: "Implants", icon: "implant", hi: { label: "इम्प्लांट" } },
  { id: "braces", label: "Braces or aligners", icon: "braces", hi: { label: "ब्रेसेज़ या अलाइनर" } },
  { id: "whitening", label: "Whitening", icon: "whitening", hi: { label: "दाँत सफ़ेद करना" } },
  { id: "kids", label: "For my child", icon: "kids", hi: { label: "बच्चे के लिए" } },
  { id: "not-sure", label: "Not sure", icon: "tooth", hi: { label: "पक्का नहीं पता" } },
];

const DEFAULT_MORNING = ["10:00 am", "10:30 am", "11:00 am", "11:30 am", "12:00 pm", "12:30 pm"];
const DEFAULT_EVENING = ["5:00 pm", "5:30 pm", "6:00 pm", "6:30 pm", "7:00 pm", "7:30 pm"];

export type BookingErrors = Partial<Record<"reason" | "day" | "slot" | "name" | "mobile" | "email", string>>;

export function BookingFlow({ preset = {}, variant = "sheet" }: { preset?: BookingPreset; variant?: "sheet" | "page" }) {
  const { site, lang } = useSite();
  const d = dentalOf(site);
  const uid = useId();
  const reasons = d.booking?.reasons?.length ? d.booking.reasons : DEFAULT_REASONS;
  const presetTreatment = findTreatment(site, preset.treatment);
  const startReason = preset.reason || reasons.find((r) => r.treatment && r.treatment === preset.treatment)?.id || presetTreatment?.reason || "";
  const branches = withText(d.branches, "name");
  const allDoctors = withText(d.doctors, "name");

  const [step, setStep] = useState(startReason || preset.treatment || preset.doctor ? 2 : 1);
  const [reason, setReason] = useState(startReason);
  const [doctor, setDoctor] = useState(preset.doctor || "");
  const [branch, setBranch] = useState(preset.branch || "");
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [reminders, setReminders] = useState(false);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [done, setDone] = useState<null | { wa?: string }>(null);

  /* Doctors at the chosen branch (chains); everyone otherwise. */
  const doctors = branch ? allDoctors.filter((x) => !x.branches?.length || x.branches.includes(branch)) : allDoctors;
  const theBranch = branches.find((b) => branchSlug(b) === branch);
  const sessions = theBranch?.sessions?.length ? theBranch.sessions : d.sessions;
  const closed = closedDaysOf(d.booking, sessions);
  const days = useMemo(() => nextDays(7, closed), [closed.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const morning = d.booking?.morning?.length ? d.booking.morning : d.booking?.evening?.length ? [] : DEFAULT_MORNING;
  const evening = d.booking?.evening?.length ? d.booking.evening : d.booking?.morning?.length ? [] : DEFAULT_EVENING;
  const theDay = days.find((x) => x.iso === day);
  const isPast = (s: string) => isPastSlot(theDay, s);
  const closedNote = tr(BOOKING_COPY.closed, lang);

  /* Pick the first day that still has a time left, once. */
  useEffect(() => {
    if (day) return;
    const first = days.find((x) => !x.closed && [...morning, ...evening].some((s) => !isPastSlot(x, s)));
    if (first) setDay(first.iso);
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Move focus to the new step's heading, never on the first render. */
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step, done]);

  const reasonLabel = bi(reasons.find((r) => r.id === reason), "label", lang) || (presetTreatment ? bi(presetTreatment, "name", lang) : "");
  const doctorName = bi(allDoctors.find((x) => doctorSlug(x) === doctor), "name", lang);
  const branchName = bi(theBranch, "name", lang);
  const when = theDay && slot ? `${dayParts(theDay.date, lang).long}, ${slot}` : "";

  function check(n: number): BookingErrors {
    const e: BookingErrors = {};
    if (n === 1 && !reason && !presetTreatment) e.reason = tr(BOOKING_MORE.errReason, lang);
    if (n === 2 && !day) e.day = tr(BOOKING_MORE.errDay, lang);
    if (n === 2 && (!slot || isPast(slot))) e.slot = tr(BOOKING_MORE.errSlot, lang);
    if (n === 3 && !name.trim()) e.name = tr(BOOKING_MORE.errName, lang);
    if (n === 3 && !validMobile(mobile)) e.mobile = tr(BOOKING_MORE.errMobile, lang);
    if (n === 3 && !validEmail(email)) e.email = tr(BOOKING_MORE.errEmail, lang);
    return e;
  }

  function message(): string {
    const lines = [
      trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }),
      reasonLabel && `${tr(BOOKING_MORE.waReason, lang)}: ${reasonLabel}`,
      `${tr(BOOKING_MORE.waDoctor, lang)}: ${doctorName || tr(BOOKING_COPY.anyDoctor, lang)}`,
      branches.length > 1 && `${tr(BOOKING_MORE.waBranch, lang)}: ${branchName || tr(BOOKING_MORE.anyBranch, lang)}`,
      when && `${tr(BOOKING_MORE.waWhen, lang)}: ${when}`,
      `${tr(BOOKING_MORE.waName, lang)}: ${name.trim()}`,
      `${tr(BOOKING_MORE.waMobile, lang)}: +91 ${mobile}`,
      email.trim() && `${tr(BOOKING_MORE.waEmail, lang)}: ${email.trim()}`,
    ];
    return lines.filter(Boolean).join("\n");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = check(step);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstBad = Object.keys(errs)[0];
      document.getElementById(`${uid}-${firstBad}`)?.focus();
      return;
    }
    if (step < 3) { setStep(step + 1); return; }
    const number = theBranch?.whatsapp || dentalContact(site).whatsapp;
    const wa = isPlaceholderNumber(number) ? undefined : whatsappHref(number, message());
    /* A clear action (the patient pressed the button): WhatsApp opens with the
       text written out. Nothing is sent until they press send there. */
    if (wa) window.open(wa, "_blank", "noopener,noreferrer");
    setDone({ wa });
  }

  const again = () => {
    setDone(null); setStep(1); setSlot(""); setErrors({});
  };

  if (done) {
    const cal = theDay && slot ? icsHref({
      title: trf(BOOKING_MORE.calTitle, lang, { clinic: site.instituteName }),
      date: theDay.date, slot,
      location: [site.instituteName, ...biList(site.contact, "addressLines", lang)].join(", "),
      note: tr(BOOKING_MORE.calNote, lang),
    }) : undefined;
    return (
      <BookingDone headingRef={heading} wa={done.wa} cal={cal} onAgain={again}
        rows={[
          [tr(BOOKING_MORE.sumReason, lang), reasonLabel],
          [tr(BOOKING_COPY.doctor, lang), doctorName || tr(BOOKING_COPY.anyDoctor, lang)],
          [tr(BOOKING_COPY.branch, lang), branches.length > 1 ? branchName || tr(BOOKING_MORE.anyBranch, lang) : ""],
          [tr(BOOKING_MORE.sumWhen, lang), when],
          [tr(BOOKING_MORE.sumName, lang), name.trim()],
          [tr(BOOKING_MORE.sumMobile, lang), `+91 ${mobile}`],
          [tr(BOOKING_MORE.sumEmail, lang), email.trim()],
        ]} />
    );
  }

  const bar = variant === "sheet"
    ? "sticky -bottom-5 z-10 -mx-5 -mb-5 mt-8 border-t border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-bottom-7 sm:-mx-7 sm:-mb-7 sm:px-7"
    : "mt-8 border-t border-[hsl(var(--ds-line))] pt-5";
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--dn-btn-radius,var(--ds-radius))] px-5 text-[15px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <form noValidate onSubmit={submit} className="dn-bk min-w-0" data-variant={variant} aria-describedby={`${uid}-demo`}>
      <div key={step} className="dn-bk-step">
        {step === 1 && (
          <BookingStepOne uid={uid} headingRef={heading} reasons={reasons} reason={reason} setReason={(r) => { setReason(r); setErrors({}); }}
            doctors={doctors} doctor={doctor} setDoctor={setDoctor}
            branches={branches} branch={branch} setBranch={(b) => { setBranch(b); setDoctor(""); setDay(""); setSlot(""); }}
            error={errors.reason} />
        )}
        {step === 2 && (
          <BookingStepTwo uid={uid} headingRef={heading} days={days} day={day} setDay={(x) => { setDay(x); setSlot(""); setErrors({}); }}
            morning={morning} evening={evening} slot={slot} setSlot={(x) => { setSlot(x); setErrors({}); }} isPast={isPast}
            closedNote={closedNote} closedLine={bi(d.booking, "closedNote", lang)} errors={errors}
            picked={[reasonLabel, doctorName, branchName].filter(Boolean).join(" · ")} onEdit={() => setStep(1)} />
        )}
        {step === 3 && (
          <BookingStepThree uid={uid} headingRef={heading} errors={errors}
            name={name} setName={setName} mobile={mobile} setMobile={setMobile} email={email} setEmail={setEmail}
            reminders={reminders} setReminders={setReminders} forChild={reason === "kids"}
            picked={[reasonLabel, when].filter(Boolean).join(" · ")} onEdit={() => setStep(2)} />
        )}
      </div>
      <div className={bar}>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button type="button" onClick={() => { setErrors({}); setStep(step - 1); }}
              className={`${btn} border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] text-[hsl(var(--ds-ink))]`}>{tr(BOOKING_COPY.back, lang)}</button>
          )}
          <button type="submit" className={`${btn} dn-book flex-1`} data-tone="cta">
            {tr(step === 3 ? BOOKING_COPY.submit : BOOKING_COPY.next, lang)}
          </button>
        </div>
        <p id={`${uid}-demo`} className="mt-2.5 text-center text-xs text-[hsl(var(--ds-ink-soft))]">{tr(BOOKING_COPY.demoNote, lang)}</p>
      </div>
    </form>
  );
}
