/**
 * The contact form itself: fields, validation, sending, the thank-you and the
 * honest failure. Rendered by src/components/sections/ContactForm.tsx.
 *
 * LAZY. ContactForm is on the home page, so anything it imports statically is
 * in the entry chunk that gates the first paint. This body (the fields, the
 * validation, the delivery code in src/lib/leads.ts) is fetched after the page
 * has loaded instead; it sits at the foot of the page and nobody can type into
 * it in the first second.
 *
 * WHO FILLS IT IN. The owner of a growing business in India, usually on
 * a phone. They give a phone number before an email, and Mehdi replies on
 * WhatsApp. Since 26 Sep 2026 the form is the FREE WEBSITE CHECK
 * (HOMEPAGE-COPY-DECK.md section 12; words from HOMEPAGE-COPY-DECK-V2.md B4), so the required fields are the three the
 * check needs: the website address (or the business name), a number, and what
 * they run. The name went optional. Every other field is optional and says so
 * in its label. Email went from required to optional:
 * it was the field most likely to make this visitor stop.
 *
 * DELIVERY is submitLead() in src/lib/leads.ts, shared with the pop-up. Read
 * its header for why a local-mode save is not a thank-you. In short: the
 * success panel below renders on `delivered` and on nothing else.
 */
import { useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { useCms, useSingleton } from "@/lib/cms/context";
import { unbreakable } from "@/lib/typography";
import {
  BUDGETS,
  LIMITS,
  leadCopyFor,
  NEEDS,
  TIMELINES,
  normalisePhone,
  prefillFromQuery,
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

const ORDER: readonly LeadField[] = ["website", "phone", "need", "name", "organisation", "city", "timeline", "budget", "email", "message"];
const P = "cf"; // id prefix: the pop-up can be on the same page, so ids and radio names must not collide.

const EMPTY: Lead = { website: "", name: "", phone: "", need: "", organisation: "", city: "", timeline: "", budget: "", email: "", message: "" };

export default function ContactFormBody() {
  const contact = useSingleton("contact");
  const { actions } = useCms();
  const { search } = useLocation();

  const [form, setForm] = useState<Lead>(() => ({ ...EMPTY, ...prefillFromQuery(search) }));
  const [errors, setErrors] = useState<Partial<Record<LeadField, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [result, setResult] = useState<LeadResult | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(Date.now());

  const refs = useRef<Partial<Record<LeadField, HTMLElement | null>>>({});
  const doneRef = useRef<HTMLHeadingElement>(null);
  const failRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const focusField = (k: LeadField) => {
    const el = refs.current[k];
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center" });
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const found = validateLead(form, "full");
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      focusField(first);
      return;
    }
    setStatus("sending");
    const r = await submitLead(form, "contact-form", {
      startedAt: startedAt.current,
      honeypot,
      saveLocal: (doc) => actions.saveDoc("submissions", doc),
    });
    setResult(r);
    if (!r.delivered) {
      // Keep everything they typed. Retyping an enquiry because our form
      // failed is our mistake charged to them.
      setStatus("error");
      requestAnimationFrame(() => failRef.current?.focus());
      return;
    }
    setStatus("done");
    requestAnimationFrame(() => doneRef.current?.focus());
  };

  const phone = normalisePhone(form.phone);
  const firstName = form.name.trim().split(/\s+/)[0];
  const wa = whatsappToUs(contact.whatsappNumber, form);
  const copy = leadCopyFor(form.need);

  if (status === "done") {
    return (
      <div className="max-w-xl">
        <h3 ref={doneRef} tabIndex={-1} className="font-display text-[18px] font-medium leading-[1.3] tracking-[-0.01em] focus:outline-none">
          Sent. Thank you{firstName ? `, ${firstName}` : ""}.
        </h3>
        <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
          Mehdi Alam, the founder, will {form.need === "software" ? "read what you sent" : "look at your site"} and reply {phone.ok && phone.kind === "landline" ? "by phone on " : "on WhatsApp to "}
          <span className="font-medium text-foreground">{phone.ok ? unbreakable(phone.display) : form.phone}</span>.{" "}
          {contact.responseTimePromise}
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ ...EMPTY });
            setStatus("idle");
            startedAt.current = Date.now();
          }}
          className={`${textLinkClass} mt-4`}
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-6" noValidate aria-describedby={`${P}-intro`}>
      <ErrorSummary errors={errors} order={ORDER} focus={focusField} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${P}-website`}
          label={copy.websiteLabel}
          autoComplete={form.need === "software" ? "off" : "url"}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={LIMITS.website}
          placeholder={copy.websitePlaceholder}
          hint={copy.websiteHint}
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
          error={errors.website}
          inputRef={(el) => (refs.current.website = el)}
        />
        <TextField
          id={`${P}-phone`}
          label="Phone or WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITS.phone}
          placeholder="98765 43210"
          hint="10-digit mobile, or + and the country code outside India"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          error={errors.phone}
          inputRef={(el) => (refs.current.phone = el)}
        />
      </div>

      <ChoiceChips
        idPrefix={P}
        name="need"
        legend="What do you run?"
        options={NEEDS}
        value={form.need}
        onChange={(v) => set("need", v)}
        error={errors.need}
        firstRef={(el) => (refs.current.need = el)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${P}-name`}
          label="Your name"
          optional
          autoComplete="name"
          maxLength={LIMITS.name}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          inputRef={(el) => (refs.current.name = el)}
        />
        <TextField
          id={`${P}-organisation`}
          label="Business or organisation"
          optional
          autoComplete="organization"
          maxLength={LIMITS.organisation}
          value={form.organisation}
          onChange={(e) => set("organisation", e.target.value)}
        />
        <TextField
          id={`${P}-city`}
          label="City"
          optional
          autoComplete="address-level2"
          maxLength={LIMITS.city}
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
        />
      </div>

      <ChoiceChips
        idPrefix={P}
        name="timeline"
        legend="When do you want to start?"
        optional
        options={TIMELINES}
        value={form.timeline}
        onChange={(v) => set("timeline", v)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id={`${P}-budget`}
          label="Budget"
          optional
          placeholder="Choose a range"
          options={BUDGETS}
          value={form.budget}
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
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
          inputRef={(el) => (refs.current.email = el)}
        />
      </div>

      <TextAreaField
        id={`${P}-message`}
        label="Anything else we should know"
        optional
        rows={4}
        maxLength={LIMITS.message}
        placeholder="What is not working today, or what you want your customers to find"
        value={form.message}
        onChange={(e) => set("message", e.target.value)}
      />

      <Honeypot idPrefix={P} value={honeypot} onChange={setHoneypot} />

      {status === "error" && (
        <div ref={failRef} tabIndex={-1} role="alert" className="rounded-[8px] bg-destructive/10 p-4 focus:outline-none">
          <span className="block text-[15px] font-medium text-destructive">
            {result?.blocked === "too-fast"
              ? "That was sent faster than anyone can type, so it was held back. Press Send again."
              : "Your enquiry did not send. The fault is at our end."}
          </span>
          <span className="mt-1.5 block text-[14px] leading-relaxed text-muted-foreground">
            Everything you typed is still in the form. The quickest way through is WhatsApp, with your details
            already written in.
          </span>
          <span className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer noopener" className={textLinkClass}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Send it on WhatsApp
              </a>
            )}
            {contact.phoneHref && (
              <a href={contact.phoneHref} className={textLinkClass}>
                Call {unbreakable(contact.phoneDisplay)}
              </a>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <button type="submit" disabled={status === "sending"} className={primaryButtonClass}>
          {status === "sending" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending
            </>
          ) : status === "error" ? (
            "Try sending again"
          ) : (
            copy.submit
          )}
        </button>
        <span className="text-[13px] text-muted-foreground">Used only to reply to you. No mailing list.</span>
      </div>
      <p id={`${P}-intro`} className="text-[13px] text-muted-foreground">
        Three things are needed: what you run, your website (or your business name or idea), and a
        phone or WhatsApp number. Everything else is optional.
      </p>
      {/* The required note above is also the form's aria-describedby. */}
      {/* Progress is announced, not just drawn. */}
      <span aria-live="polite" className="sr-only">
        {status === "sending" ? "Sending your enquiry." : ""}
      </span>
    </form>
  );
}
