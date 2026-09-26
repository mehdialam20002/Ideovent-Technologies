/**
 * THE ENQUIRY CARD.
 * ════════════════════════════════════════════════════════════════════════════
 * Mehdi asked for a form that appears after a minute on the site, asks for
 * the important things, and once closed never comes back. What the research
 * says about doing that without being the thing everybody hates:
 *
 *   Google, "Avoid intrusive interstitials and dialogs": do not obscure the
 *   whole page; a banner that takes a fraction of the screen is fine.
 *   -> Not a centred modal. A 380px card in the bottom-right corner on a
 *      desktop, a bottom sheet on a phone that opens at roughly a third to a
 *      half of the screen and never passes three quarters of it, even after
 *      the visitor has opened the fields. The page stays readable and
 *      scrollable behind it, and nothing is dimmed.
 *
 *      The cap was 60% until 26 Sep 2026. On a 390x640 phone that left the
 *      phone field and the send button below the bottom of the sheet, so the
 *      one action the card exists for needed a scroll nobody knew to make.
 *      Now the send row is sticky at the foot of the sheet (see ACTION_ROW),
 *      and the extra height is only ever taken after the visitor's own tap.
 *
 *   NN/g, "Popups: 10 Problematic Trends": the worst offenders appear before
 *   the visitor has read anything, ask for an email before any interaction,
 *   block content, and stack. Their suggested alternative for a sign-up is a
 *   non-modal card in a corner, shown after meaningful engagement.
 *   -> 60 seconds of ENGAGED time (tab on screen, counted across pages),
 *      never while somebody is typing, never while the contact form is
 *      already on screen, one card only, and it asks for a phone number
 *      and a need, not an email.
 *
 *   Baymard: overlays that appear on their own are closed reflexively,
 *   unread, and called "spam"; overlays are fine as a response to a user
 *   action.
 *   -> The first thing it asks is one tap ("What do you run?"). The website
 *      and phone fields only open after that tap, so the part that appeared on
 *      its own is small, and the part that asks for details is something the
 *      visitor chose to open.
 *
 *   And the rule every good one keeps: CLOSED MEANS CLOSED. One dismissal
 *   retires it in that browser for good, and so does any enquiry sent from
 *   either form. See popupMemory() in src/lib/leads.ts.
 *
 * ACCESSIBILITY. role="dialog" aria-modal="false": it is a dialog, but not a
 * modal one, so it does not trap focus and does not take focus when it
 * appears (a keyboard user in the middle of the page is not yanked to the
 * corner). It announces itself through a polite live region instead, and sits
 * in a labelled <aside> landmark so a screen reader user can jump to it.
 * Escape closes it; so does the 44px close button. If focus was inside it
 * when it closed, focus goes back to where the visitor came from.
 *
 * THIS FILE IS NOT IN THE ENTRY CHUNK. LeadPopupMount imports it lazily when
 * the timer fires, so the 99% of page views that never see it never download
 * it, and it cannot move LCP or CLS.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, MessageCircle, X } from "lucide-react";
import { useCms, useSingleton } from "@/lib/cms/context";
import { unbreakable } from "@/lib/typography";
import {
  BUDGETS,
  LIMITS,
  leadCopyFor,
  NEEDS,
  TIMELINES,
  normalisePhone,
  submitLead,
  validateLead,
  whatsappToUs,
  type Lead,
  type LeadField,
  type LeadResult,
} from "@/lib/leads";
import {
  ChoiceChips,
  ErrorSummary,
  Honeypot,
  SelectField,
  TextAreaField,
  TextField,
  primaryButtonClass,
  textLinkClass,
} from "./fields";
import "./lead-popup.css";

type Stage = "ask" | "sending" | "failed" | "sent" | "details" | "sending-details" | "details-failed" | "done";

const P = "lp";
const QUICK: readonly LeadField[] = ["need", "website", "phone"];

/*
  The row that holds Send. Sticky at the foot of the scrolling sheet, on the
  card's own background, so the button is on screen however short the phone
  is; the fields scroll up behind it. That is why the sheet itself has no
  bottom padding: a sticky box sits inside the scroll container's padding, and
  a gap under it would show the fields sliding past beneath the button. The
  row carries the bottom padding instead, safe-area inset included, and the
  negative side margins take its background to the card's edges.
*/
const ACTION_ROW =
  "sticky bottom-0 z-[1] -mx-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-5 sm:px-5 sm:pb-5";
/** Bottom padding for the parts of the card that end without an ACTION_ROW. */
const END_PAD = "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5";

/*
  Module scope on purpose. Every page renders its own <Layout>, so moving from
  / to /work unmounts this card and mounts a fresh one. A half-typed enquiry
  living in component state would be thrown away by a click on a nav link.
  The module is loaded once per visit, so this survives the remount.
*/
const draft: { lead: Lead; stage: Stage; sentId?: string; startedAt: number; honeypot: string } = {
  lead: { website: "", name: "", phone: "", need: "", organisation: "", city: "", timeline: "", budget: "", email: "", message: "" },
  stage: "ask",
  startedAt: Date.now(),
  honeypot: "",
};

export interface LeadPopupProps {
  heading: string;
  subheading: string;
  /** Closed before sending: remember it, never show again. */
  onDismiss: () => void;
  /** Closed after a successful send. */
  onFinish: () => void;
}

export default function LeadPopup({ heading, subheading, onDismiss, onFinish }: LeadPopupProps) {
  const contact = useSingleton("contact");
  const { actions } = useCms();
  const uid = useId();
  const headingId = `${uid}-heading`;
  const subId = `${uid}-sub`;

  const [lead, setLeadState] = useState<Lead>(draft.lead);
  const [stage, setStageState] = useState<Stage>(draft.stage);
  const [errors, setErrors] = useState<Partial<Record<LeadField, string>>>({});
  const [result, setResult] = useState<LeadResult | null>(null);
  const [honeypot, setHoneypotState] = useState(draft.honeypot);
  const [announce, setAnnounce] = useState("");

  const boxRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const refs = useRef<Partial<Record<LeadField, HTMLElement | null>>>({});
  const alertRef = useRef<HTMLDivElement>(null);
  const thanksRef = useRef<HTMLHeadingElement>(null);

  const setLead = (next: Lead) => {
    draft.lead = next;
    setLeadState(next);
  };
  const setStage = (s: Stage) => {
    draft.stage = s;
    setStageState(s);
  };
  const setHoneypot = (v: string) => {
    draft.honeypot = v;
    setHoneypotState(v);
  };
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => {
    setLead({ ...draft.lead, [k]: v });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // 26 Sep 2026: "What do you run?" has seven answers now (four rows of chips
  // on a phone, HOMEPAGE-COPY-DECK-V2.md B2), so on a short phone the fields a
  // tap opens start below the sticky send row. On the first tap, scroll the
  // card (never the page) just far enough that the phone field sits above the
  // send row. Nothing moves when the fields already fit.
  const hadNeed = useRef(Boolean(draft.lead.need));
  // A layout effect, not a timer: it runs once the fields are in the DOM and
  // before paint, so the card never shows the unscrolled frame.
  useLayoutEffect(() => {
    if (!lead.need || hadNeed.current) return;
    hadNeed.current = true;
    const box = boxRef.current;
    const phone = refs.current.phone;
    const send = box?.querySelector<HTMLElement>("button[type=submit]");
    if (!box || !phone || !send) return;
    const over = phone.getBoundingClientRect().bottom - (send.getBoundingClientRect().top - 16);
    if (over > 0) box.scrollTop += over;
  }, [lead.need]);

  // Announce, do not grab focus. The live region is rendered empty first and
  // filled a beat later, because a region that arrives already holding text
  // is not reliably read out.
  useEffect(() => {
    const t = window.setTimeout(
      () => setAnnounce(`${heading} A short enquiry form has opened at the bottom of the screen. Press Escape to close it.`),
      300,
    );
    return () => window.clearTimeout(t);
  }, [heading]);

  // Remember where focus came from, so closing can put it back.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const onFocusIn = (e: FocusEvent) => {
      const from = e.relatedTarget as HTMLElement | null;
      if (from && !box.contains(from)) returnTo.current = from;
    };
    box.addEventListener("focusin", onFocusIn);
    return () => box.removeEventListener("focusin", onFocusIn);
  }, []);

  const close = useCallback(
    (how: "dismiss" | "finish") => {
      const box = boxRef.current;
      const hadFocus = Boolean(box && box.contains(document.activeElement));
      if (hadFocus) {
        const back = returnTo.current;
        if (back && back.isConnected) back.focus({ preventScroll: true });
        else document.getElementById("main")?.focus({ preventScroll: true });
      }
      if (how === "dismiss") onDismiss();
      else onFinish();
    },
    [onDismiss, onFinish],
  );

  const sent = stage === "sent" || stage === "details" || stage === "sending-details" || stage === "details-failed" || stage === "done";
  const closeNow = useCallback(() => close(sent ? "finish" : "dismiss"), [close, sent]);

  // Escape closes it: from inside the card always; from elsewhere on the page
  // too, so a screen reader user who heard the announcement can close it
  // without hunting for it. Not when Escape belongs to something else: the
  // mega menu, another open dialog, or a form field on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const box = boxRef.current;
      const target = e.target as HTMLElement | null;
      const inside = Boolean(box && target && box.contains(target));
      if (!inside) {
        if (target?.closest("header, nav, [role='menu'], [role='listbox']")) return;
        if (document.querySelector("header [aria-expanded='true']")) return;
        if (document.querySelector("[aria-modal='true']")) return;
        if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      }
      closeNow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeNow]);

  const focusField = (k: LeadField) => {
    const el = refs.current[k];
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest" });
  };

  const onSend = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validateLead(lead, "quick");
    setErrors(found);
    const first = QUICK.find((k) => found[k]);
    if (first) {
      requestAnimationFrame(() => focusField(first));
      return;
    }
    setStage("sending");
    const r = await submitLead(lead, "popup", {
      startedAt: draft.startedAt,
      honeypot,
      saveLocal: (doc) => actions.saveDoc("submissions", doc),
    });
    setResult(r);
    if (!r.delivered) {
      setStage("failed");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    draft.sentId = r.id;
    setStage("sent");
    requestAnimationFrame(() => thanksRef.current?.focus());
  };

  const onSendDetails = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validateLead(lead, "full");
    // Only the optional fields are on screen here; the quick ones already passed.
    const emailError = found.email;
    setErrors(emailError ? { email: emailError } : {});
    if (emailError) {
      requestAnimationFrame(() => focusField("email"));
      return;
    }
    setStage("sending-details");
    const r = await submitLead(lead, "popup", {
      startedAt: draft.startedAt,
      honeypot,
      followUpOf: draft.sentId,
      saveLocal: (doc) => actions.saveDoc("submissions", doc),
    });
    setResult(r);
    setStage(r.delivered ? "done" : "details-failed");
    requestAnimationFrame(() => (r.delivered ? thanksRef.current?.focus() : alertRef.current?.focus()));
  };

  const phone = normalisePhone(lead.phone);
  const firstName = lead.name.trim().split(/\s+/)[0];
  const wa = whatsappToUs(contact.whatsappNumber, lead);
  const replyHow = phone.ok && phone.kind === "landline" ? "by phone" : "on WhatsApp";

  const waLink = (label: string, strong = false) =>
    wa ? (
      <a
        href={wa}
        target="_blank"
        rel="noreferrer noopener"
        className={strong ? `${primaryButtonClass} w-full sm:w-auto` : `${textLinkClass} text-[14px]`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {label}
        {!strong && <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
      </a>
    ) : null;

  return (
    <aside aria-label="Quick enquiry" className="lead-popup fixed inset-x-0 bottom-0 z-[45] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]">
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={headingId}
        aria-describedby={subId}
        // No bottom padding here: ACTION_ROW and END_PAD carry it, see ACTION_ROW.
        // scroll-pb keeps a field that focusField() scrolls to clear of the
        // sticky row instead of tucked under it.
        className="max-h-[75dvh] scroll-pb-24 overflow-y-auto overscroll-contain rounded-t-[12px] border-t border-border bg-card px-4 pb-0 pt-4 text-card-foreground shadow-[0_-12px_32px_-12px_rgb(0_0_0/0.35)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[12px] sm:border sm:px-5 sm:pt-5 sm:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 id={headingId} className="font-display text-[18px] font-medium leading-[1.3] tracking-[-0.01em]">
              {(!sent && leadCopyFor(lead.need).heading) || heading}
            </h3>
            {/* On a short phone, once the visitor has tapped a need, the three
                lines of offer give way to the fields they just asked for: at
                360x640 they are the difference between the phone field sitting
                above the send row and under it. The text stays in the DOM, so
                aria-describedby still reads it, and it is back on any taller
                or wider screen. */}
            <span
              id={subId}
              className={`mt-1 block text-[14px] leading-[1.45] text-muted-foreground ${
                lead.need && !sent ? "[@media(max-width:639px)_and_(max-height:760px)]:hidden" : ""
              }`}
            >
              {(!sent && leadCopyFor(lead.need).subheading) || subheading}
            </span>
          </div>
          <button
            type="button"
            onClick={closeNow}
            aria-label="Close"
            className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {!sent ? (
          // 12px between fields on a phone rather than 16: with a 640px screen
          // every row of it is height the send button would otherwise lose.
          <form onSubmit={onSend} noValidate className="relative mt-3 space-y-3 sm:mt-4 sm:space-y-4">
            {stage === "failed" && (
              <div ref={alertRef} tabIndex={-1} role="alert" className="space-y-3 rounded-[8px] bg-destructive/10 p-3 focus:outline-none">
                <span className="block text-[14px] font-medium leading-5 text-destructive">
                  {result?.blocked === "too-fast"
                    ? "That went faster than anyone can type, so it was held back."
                    : "It did not send. The fault is at our end, not yours."}
                </span>
                <span className="block text-[13px] leading-5 text-muted-foreground">
                  What you typed is still here. WhatsApp reaches us now, with your details already written in.
                </span>
                {waLink("Send it on WhatsApp", true)}
              </div>
            )}

            <ErrorSummary errors={errors} order={QUICK} focus={focusField} compact />

            <ChoiceChips
              idPrefix={P}
              name="need"
              legend="What do you run?"
              options={NEEDS}
              value={lead.need}
              onChange={(v) => set("need", v)}
              error={errors.need}
              firstRef={(el) => (refs.current.need = el)}
            />

            {/* Opened by the visitor's own tap on a chip, so the part of the
                card that appeared unasked stays small. Kept open once a
                need is chosen, including after a failed send. */}
            {lead.need && (
              <>
                {/* 26 Sep 2026: the card is the free website check, so the
                    website comes first and the name moved to the optional
                    second step (HOMEPAGE-COPY-DECK.md section 13). */}
                <TextField
                  id={`${P}-website`}
                  label={leadCopyFor(lead.need).websiteLabel}
                  autoComplete={lead.need === "software" ? "off" : "url"}
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={LIMITS.website}
                  placeholder={leadCopyFor(lead.need).websitePlaceholder}
                  value={lead.website}
                  onChange={(e) => set("website", e.target.value)}
                  error={errors.website}
                  inputRef={(el) => (refs.current.website = el)}
                />
                <div className="grid grid-cols-1 gap-3">
                  <TextField
                    id={`${P}-phone`}
                    label="Phone or WhatsApp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={LIMITS.phone}
                    placeholder="98765 43210"
                    value={lead.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    error={errors.phone}
                    inputRef={(el) => (refs.current.phone = el)}
                  />
                </div>
                <span className="-mt-2 block text-[13px] leading-5 text-muted-foreground">
                  Outside India? Start the number with + and the country code.
                </span>
                <Honeypot idPrefix={P} value={honeypot} onChange={setHoneypot} />
              </>
            )}

            <div className={ACTION_ROW}>
              {lead.need && (
                <button type="submit" disabled={stage === "sending"} className={primaryButtonClass}>
                  {stage === "sending" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending
                    </>
                  ) : stage === "failed" ? (
                    "Try again"
                  ) : (
                    leadCopyFor(lead.need).submit
                  )}
                </button>
              )}
              {stage !== "failed" && waLink(lead.need ? "or WhatsApp us" : "Rather talk on WhatsApp?")}
            </div>
          </form>
        ) : (
          <div className={`mt-4 space-y-4 ${stage === "sent" || stage === "done" ? END_PAD : ""}`}>
            <div>
              <h4 ref={thanksRef} tabIndex={-1} className="font-display text-[16px] font-medium leading-[1.3] focus:outline-none">
                {stage === "done" ? "Details added. Thank you." : `Sent. Thank you${firstName ? `, ${firstName}` : ""}.`}
              </h4>
              <span className="mt-1 block text-[14px] leading-[1.5] text-muted-foreground">
                Mehdi Alam, the founder, will reply {replyHow} to{" "}
                <span className="font-medium text-foreground">{phone.ok ? unbreakable(phone.display) : lead.phone}</span>.{" "}
                {contact.responseTimePromise}
              </span>
            </div>

            {stage === "sent" && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <button type="button" onClick={() => setStage("details")} className={primaryButtonClass}>
                  Add a few details
                </button>
                <button type="button" onClick={() => close("finish")} className={`${textLinkClass} text-[14px]`}>
                  No thanks, close
                </button>
              </div>
            )}

            {(stage === "details" || stage === "sending-details" || stage === "details-failed") && (
              <form onSubmit={onSendDetails} noValidate className="space-y-4">
                <span className="block text-[13px] leading-5 text-muted-foreground">
                  All optional. Whatever you add goes with the enquiry you just sent.
                </span>
                {stage === "details-failed" && (
                  <div ref={alertRef} tabIndex={-1} role="alert" className="space-y-3 rounded-[8px] bg-destructive/10 p-3 focus:outline-none">
                    <span className="block text-[14px] font-medium leading-5 text-destructive">
                      The details did not send. Your enquiry did, so Mehdi will still reply.
                    </span>
                    {waLink("Send the details on WhatsApp", true)}
                  </div>
                )}
                <ErrorSummary errors={errors} order={["email"] as const} focus={focusField} compact />
                <TextField
                  id={`${P}-name`}
                  label="Your name"
                  optional
                  autoComplete="name"
                  maxLength={LIMITS.name}
                  value={lead.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <TextField
                  id={`${P}-organisation`}
                  label="Business or organisation"
                  optional
                  autoComplete="organization"
                  maxLength={LIMITS.organisation}
                  value={lead.organisation}
                  onChange={(e) => set("organisation", e.target.value)}
                />
                <TextField
                  id={`${P}-city`}
                  label="City"
                  optional
                  autoComplete="address-level2"
                  maxLength={LIMITS.city}
                  value={lead.city}
                  onChange={(e) => set("city", e.target.value)}
                />
                <ChoiceChips
                  idPrefix={P}
                  name="timeline"
                  legend="When do you want to start?"
                  optional
                  options={TIMELINES}
                  value={lead.timeline}
                  onChange={(v) => set("timeline", v)}
                />
                <SelectField
                  id={`${P}-budget`}
                  label="Budget"
                  optional
                  placeholder="Choose a range"
                  options={BUDGETS}
                  value={lead.budget}
                  onChange={(e) => set("budget", e.target.value as Lead["budget"])}
                />
                <TextField
                  id={`${P}-email`}
                  label="Email"
                  optional
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={LIMITS.email}
                  value={lead.email}
                  onChange={(e) => set("email", e.target.value)}
                  error={errors.email}
                  inputRef={(el) => (refs.current.email = el)}
                />
                <TextAreaField
                  id={`${P}-message`}
                  label="Anything else"
                  optional
                  rows={3}
                  maxLength={LIMITS.message}
                  value={lead.message}
                  onChange={(e) => set("message", e.target.value)}
                />
                <div className={ACTION_ROW}>
                  <button type="submit" disabled={stage === "sending-details"} className={primaryButtonClass}>
                    {stage === "sending-details" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending
                      </>
                    ) : (
                      "Send details"
                    )}
                  </button>
                  <button type="button" onClick={() => close("finish")} className={`${textLinkClass} text-[14px]`}>
                    Close
                  </button>
                </div>
              </form>
            )}

            {stage === "done" && (
              <button type="button" onClick={() => close("finish")} className={`${textLinkClass} text-[14px]`}>
                Close
              </button>
            )}
          </div>
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {stage === "sending" || stage === "sending-details" ? "Sending." : announce}
      </span>
    </aside>
  );
}
