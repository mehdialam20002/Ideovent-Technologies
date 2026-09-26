/**
 * SCHOOL ADMISSIONS: THE REFERENCE PAGE. Copy its shape for every other page.
 * The contract it follows is src/lib/demo/pages/README.md.
 *
 * Sections (DEMO-SCHOOL-IA.md 5.3), each rendered only when it has data:
 *   head      title, the admissions line, a DATED status chip that hides
 *             itself after `admissionsOpenUntil` (no ticker, no pop-up)
 *   1 triad   Enquire, Visit, Apply as three equal actions
 *   2 who     who can apply, and the programmes (courses as age bands)
 *   3 age     the age checker, only when `admissions.ageRules` is set
 *   4 steps   the dated timeline, else the generic kept steps
 *   5 papers  documents to bring
 *   6 fees    one-time, annual, term, monthly, and "also payable" extras
 *   7 notes   the RTE line (only if typed) and the official-channels line
 *   8 form    a five-field enquiry that opens WhatsApp or email, stores nothing
 *   9 faq     the FAQ entries grouped "Admissions"
 *
 * A record with a name and a city renders: the head, the triad (Visit via
 * the map search), the kept steps and documents, the official-channels line.
 */

import { useState, type FormEvent } from "react";
import type { DemoFeeRow } from "@/lib/cms/types";
import { demoFee } from "@/lib/demo/record";
import { bi, biList, hasBi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Reveal } from "../kit/motion";
import { Card, CardGrid, Section } from "../kit/Section";
import { Accordion, Action, Bi } from "../kit/Text";
import { Timeline } from "@/lib/demo/ui/school/Timeline";
import { demoDateIn, Str } from "@/lib/demo/ui/school/shared";
import { slotPhoto, WithPhoto } from "@/lib/demo/ui/school/photos";

const COPY = {
  title: { en: "Admissions", hi: "एडमिशन" },
  titleSession: { en: "Admissions {session}", hi: "एडमिशन {session}" },
  openUntil: { en: "Admissions {session} open until {date}", hi: "एडमिशन {session} {date} तक खुले हैं" },
  triadTitle: { en: "Three ways to begin", hi: "शुरू करने के तीन तरीके" },
  enquire: { en: "Enquire", hi: "जानकारी लें" },
  enquireBody: { en: "Ask about seats, fees and the process.", hi: "सीट, फीस और प्रोसेस के बारे में पूछें।" },
  visit: { en: "Visit the school", hi: "स्कूल देखने आएँ" },
  visitBody: { en: "See an ordinary school day before you decide.", hi: "फैसला करने से पहले एक आम दिन देखें।" },
  apply: { en: "Apply", hi: "अप्लाई करें" },
  applyBody: { en: "Start the application for your child.", hi: "अपने बच्चे का आवेदन शुरू करें।" },
  whoTitle: { en: "Who can apply", hi: "कौन अप्लाई कर सकता है" },
  ageTitle: { en: "Check your child's class", hi: "बच्चे की क्लास देखें" },
  ageLead: { en: "Enter the date of birth. Ages are counted as on {asOn}.", hi: "जन्म तिथि डालें। उम्र {asOn} के हिसाब से गिनी जाती है।" },
  dob: { en: "Date of birth", hi: "जन्म तिथि" },
  ageResult: { en: "Eligible for {cls}", hi: "{cls} के लिए योग्य" },
  ageNone: { en: "No class matches this date of birth. Please call the office.", hi: "इस जन्म तिथि के लिए कोई क्लास नहीं मिली। ऑफ़िस से बात करें।" },
  ageRelax: { en: "The school may allow a relaxation of up to one month. Ask the office.", hi: "स्कूल एक महीने तक की छूट दे सकता है। ऑफ़िस से पूछें।" },
  stepsTitle: { en: "How admission works", hi: "एडमिशन कैसे होता है" },
  docsTitle: { en: "Documents to bring", hi: "साथ लाने वाले डॉक्यूमेंट" },
  feesTitle: { en: "Fees", hi: "फीस" },
  periods: { en: "One-time|Annual|Per term|Monthly|Also payable", hi: "एक बार|सालाना|हर टर्म|महीने की|अलग से" },
  rteTitle: { en: "RTE seats", hi: "RTE सीटें" },
  officialTitle: { en: "Official channels only", hi: "सिर्फ़ आधिकारिक तरीके" },
  officialBody: {
    en: "Admission is decided by the school office alone. Nobody can promise a seat for a payment. Pay fees only at the school or through the channels on this page.",
    hi: "एडमिशन का फैसला सिर्फ़ स्कूल ऑफ़िस करता है। पैसे लेकर सीट का वादा कोई नहीं कर सकता। फीस सिर्फ़ स्कूल में या इस पेज पर दिए तरीकों से भरें।",
  },
  formTitle: { en: "Send an enquiry", hi: "पूछताछ भेजें" },
  formLeadWa: { en: "This opens WhatsApp with your message. Nothing is stored on this site.", hi: "यह आपका मैसेज WhatsApp में खोलेगा। इस वेबसाइट पर कुछ सेव नहीं होता।" },
  formLeadMail: { en: "This opens your email app with your message. Nothing is stored on this site.", hi: "यह आपका मैसेज ईमेल ऐप में खोलेगा। इस वेबसाइट पर कुछ सेव नहीं होता।" },
  parent: { en: "Parent's name", hi: "अभिभावक का नाम" },
  child: { en: "Child's name", hi: "बच्चे का नाम" },
  classSought: { en: "Class sought", hi: "कौन सी क्लास" },
  phone: { en: "Phone number", hi: "फ़ोन नंबर" },
  message: { en: "Message (optional)", hi: "मैसेज (ज़रूरी नहीं)" },
  send: { en: "Send enquiry", hi: "पूछताछ भेजें" },
  msgIntro: { en: "Admission enquiry", hi: "एडमिशन के लिए पूछताछ" },
  faqTitle: { en: "Questions parents ask", hi: "अभिभावकों के सवाल" },
} satisfies Record<string, Bilingual>;

export default function AdmissionsPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const a = site.admissions || {};
  let n = 0;
  const { actions } = ctx;
  const session = bi(site, "sessionLabel", lang);
  const open = session && site.admissionsOpenUntil && site.admissionsOpenUntil >= ctx.today;
  const wa = (text: string) => (actions.whatsapp ? `${actions.whatsapp}?text=${encodeURIComponent(text)}` : "");
  const formTarget: "wa" | "mail" | null = actions.whatsapp ? "wa" : actions.email ? "mail" : null;
  const contact = ctx.href("contact");
  const intro = `${tr(COPY.msgIntro, lang)}: ${site.instituteName}`;

  /* The triad. Each action is the most direct real channel the record has. */
  const enquireHref = wa(intro) || actions.tel || contact || (formTarget ? "#enquire" : actions.map);
  const visitHref = contact || actions.map;
  const applyHref = (a.applyUrl || "").trim() || (formTarget ? "#enquire" : enquireHref);
  const triad = [
    { key: "enquire", title: COPY.enquire, body: COPY.enquireBody, href: enquireHref },
    { key: "visit", title: COPY.visit, body: COPY.visitBody, href: visitHref },
    { key: "apply", title: COPY.apply, body: COPY.applyBody, href: applyHref },
  ];

  const programmes = withText(site.courses, "name");
  const timeline = withText(a.timeline, "title");
  const steps = biList(a, "steps", lang);
  const docs = biList(a, "documents", lang);
  const fees = withText(a.fees, "label");
  const faq = withText(site.faq, "title").filter((f) => /admission|प्रवेश/i.test(`${f.group || ""} ${f.hi?.group || ""}`));

  return (
    <>
      <PageHead
        title={session ? trf(COPY.titleSession, lang, { session }) : tr(COPY.title, lang)}
        lead={<Bi of={site} k="admissionsHeadline" />}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      >
        {open && (
          <p className="mt-5 inline-flex rounded-full border border-current px-3 py-1 text-sm font-semibold">
            {trf(COPY.openUntil, lang, { session, date: demoDateIn(site.admissionsOpenUntil, site.market, lang) })}
          </p>
        )}
      </PageHead>

      <Section n={++n} title={tr(COPY.triadTitle, lang)}>
        <CardGrid cols={3}>
          {triad.map((t, i) => (
            <Reveal key={t.key} index={i}>
              <Card interactive className="h-full">
                <p className="ds-display text-xl">{tr(t.title, lang)}</p>
                <p className="mt-2 text-[hsl(var(--ds-ink-soft))]">{tr(t.body, lang)}</p>
                <div className="mt-4">
                  {t.href.startsWith("#")
                    ? <a href={t.href} className={`ds-btn ${t.key === "apply" ? "ds-btn-cta" : "ds-btn-ghost"}`}>{tr(t.title, lang)}</a>
                    : <Action href={t.href} tone={t.key === "apply" ? "cta" : "ghost"}>{tr(t.title, lang)}</Action>}
                </div>
              </Card>
            </Reveal>
          ))}
        </CardGrid>
      </Section>

      {(a.whoCanApply || a.hi?.whoCanApply || programmes.length > 0) && (
        <Section n={++n} title={tr(COPY.whoTitle, lang)}>
          <Bi of={a} k="whoCanApply" as="p" className="mb-6 max-w-prose text-lg" />
          {programmes.length > 0 && (
            <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
              {programmes.map((c, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <Bi of={c} k="name" className="font-semibold" />
                  <Bi of={c} k="level" className="text-[hsl(var(--ds-ink-soft))]" />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {(a.ageRules || []).length > 0 && sessionYear(session) && (
        <Section n={++n} title={tr(COPY.ageTitle, lang)}>
          <AgeChecker rules={a.ageRules!} year={sessionYear(session)!} asOn={a.ageAsOn || "31 March"} lang={lang} />
        </Section>
      )}

      {(timeline.length > 0 || steps.length > 0) && (
        <Section n={++n} title={tr(COPY.stepsTitle, lang)}>
          {/* The connecting line draws once as the steps enter (ui/school/Timeline). */}
          <WithPhoto src={slotPhoto(site, "admissions")} ratio="4 / 5">
          <div className="max-w-2xl">
            <Timeline numbered steps={timeline.length > 0
              ? timeline.map((t, i) => ({ key: String(i), date: hasBi(t, "date") ? <Bi of={t} k="date" /> : undefined, title: <Bi of={t} k="title" />, body: hasBi(t, "body") ? <Bi of={t} k="body" /> : undefined }))
              : steps.map((st, i) => ({ key: String(i), title: <Str text={st} /> }))} />
          </div>
          </WithPhoto>
        </Section>
      )}

      {docs.length > 0 && (
        <Section n={++n} title={tr(COPY.docsTitle, lang)}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {docs.map((d, i) => <li key={i} className="flex gap-3"><span aria-hidden="true" className="text-[hsl(var(--ds-accent))]">✓</span>{d}</li>)}
          </ul>
        </Section>
      )}

      {fees.length > 0 && (
        <Section n={++n} title={tr(COPY.feesTitle, lang)}>
          <FeeTable rows={fees} currency={site.currency} lang={lang} />
          <Bi of={a} k="feeNote" as="p" className="mt-4 text-[hsl(var(--ds-ink-soft))]" />
        </Section>
      )}

      <Section n={++n} title={tr(COPY.officialTitle, lang)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><p>{tr(COPY.officialBody, lang)}</p></Card>
          {(a.rteNote || a.hi?.rteNote) && (
            <Card>
              <p className="font-semibold">{tr(COPY.rteTitle, lang)}</p>
              <Bi of={a} k="rteNote" as="p" className="mt-2" />
            </Card>
          )}
        </div>
      </Section>

      {formTarget && (
        <Section n={++n} id="enquire" title={tr(COPY.formTitle, lang)} lead={tr(formTarget === "wa" ? COPY.formLeadWa : COPY.formLeadMail, lang)}>
          <EnquiryForm target={formTarget} whatsapp={actions.whatsapp} email={site.contact?.email} intro={intro} lang={lang}
            classes={programmes.map((c) => bi(c, "name", lang))} />
        </Section>
      )}

      {faq.length > 0 && (
        <Section n={++n} title={tr(COPY.faqTitle, lang)}>
          <div className="max-w-3xl">
            {faq.map((f, i) => (
              <Accordion key={i} title={<Bi of={f} k="title" />}><Bi of={f} k="body" as="p" /></Accordion>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/* ── Parts of this page ──────────────────────────────────────────────────── */

type Lang = SitePageProps["ctx"]["lang"];

/** "2027-28" -> 2027. The age checker needs the session; no session, no checker. */
function sessionYear(session: string): number | null {
  const m = /(20\d\d)/.exec(session || "");
  return m ? Number(m[1]) : null;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function AgeChecker({ rules, year, asOn, lang }: {
  rules: NonNullable<NonNullable<SitePageProps["site"]["admissions"]>["ageRules"]>;
  year: number;
  asOn: string;
  lang: Lang;
}) {
  const [dob, setDob] = useState("");
  const m = /(\d{1,2})\s+([a-z]+)/i.exec(asOn);
  /* "31 March 2027" carries its own year; "31 March" takes the session's. */
  const typedYear = /\b(\d{4})\b/.exec(asOn);
  const onYear = typedYear ? Number(typedYear[1]) : year;
  const month = m ? MONTHS.findIndex((x) => x.startsWith(m[2].toLowerCase().slice(0, 3))) : 2;
  const on = new Date(onYear, month < 0 ? 2 : month, m ? Number(m[1]) : 31);
  let result: string | null = null;
  if (dob) {
    const b = new Date(dob);
    /* Age in whole months, so half-year bands ("2.5") work. */
    let months = (on.getFullYear() - b.getFullYear()) * 12 + (on.getMonth() - b.getMonth());
    if (on.getDate() < b.getDate()) months--;
    const age = months / 12;
    const sorted = [...rules].filter((r) => r.className && r.minAge).sort((x, y) => Number(x.minAge) - Number(y.minAge));
    /* minAge is "as on" the date; maxAge is exclusive ("3 to 4" means under 4). */
    const fit = sorted.filter((r) => age >= Number(r.minAge) && (!r.maxAge || age < Number(r.maxAge))).pop();
    result = fit ? trf(COPY.ageResult, lang, { cls: bi(fit, "className", lang) || fit.className }) : tr(COPY.ageNone, lang);
  }
  /* In Hindi, the parsed date is printed with Hindi month names ("31 मार्च 2027"). */
  const asOnText = lang === "hi" && m && month >= 0
    ? on.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" })
    : typedYear ? asOn : `${asOn} ${year}`;
  return (
    <div className="max-w-xl">
      <p className="text-[hsl(var(--ds-ink-soft))]">{trf(COPY.ageLead, lang, { asOn: asOnText })}</p>
      <label className="mt-4 block font-semibold" htmlFor="ds-dob">{tr(COPY.dob, lang)}</label>
      <input id="ds-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)}
        className="mt-2 min-h-[48px] w-full rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-3" />
      <p aria-live="polite" className="mt-4 text-lg font-semibold text-[hsl(var(--ds-brand-ink))]">{result}</p>
      <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.ageRelax, lang)}</p>
    </div>
  );
}

const PERIOD_ORDER: NonNullable<DemoFeeRow["period"]>[] = ["one-time", "annual", "term", "monthly", "also"];

function FeeTable({ rows, currency, lang }: { rows: DemoFeeRow[]; currency: SitePageProps["site"]["currency"]; lang: Lang }) {
  const names = tr(COPY.periods, lang).split("|");
  const groups = PERIOD_ORDER.map((p, i) => ({ name: names[i], rows: rows.filter((r) => (r.period || "annual") === p) })).filter((g) => g.rows.length);
  return (
    /* Label and note share a cell so the amount stays on screen at 360px. */
    <div>
      <table className="w-full border-collapse text-left">
        {groups.map((g) => (
          <tbody key={g.name}>
            <tr><th colSpan={2} className="border-b-2 border-[hsl(var(--ds-ink))] pb-2 pt-6 text-sm uppercase tracking-wider text-[hsl(var(--ds-accent))]">{g.name}</th></tr>
            {g.rows.map((r, i) => (
              <tr key={i} className="border-b border-[hsl(var(--ds-line))]">
                <td className="py-3 pr-4"><Bi of={r} k="label" className="block font-medium" /><Bi of={r} k="note" className="mt-0.5 block text-sm text-[hsl(var(--ds-ink-soft))]" /></td>
                <td className="ds-num whitespace-nowrap py-3 text-right align-top font-semibold">{demoFee(bi(r, "amount", lang), currency)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Five fields. Opens WhatsApp or the mail app with the message. Stores nothing. */
function EnquiryForm({ target, whatsapp, email, intro, classes, lang }: {
  target: "wa" | "mail";
  whatsapp?: string;
  email?: string;
  intro: string;
  classes: string[];
  lang: Lang;
}) {
  const [v, set] = useState({ parent: "", child: "", cls: "", phone: "", message: "" });
  const field = "mt-1 min-h-[48px] w-full rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-3";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const lines = [intro, `${tr(COPY.parent, lang)}: ${v.parent}`, `${tr(COPY.child, lang)}: ${v.child}`,
      `${tr(COPY.classSought, lang)}: ${v.cls}`, `${tr(COPY.phone, lang)}: ${v.phone}`, v.message].filter((x) => x.trim());
    const text = lines.join("\n");
    if (target === "wa" && whatsapp) window.open(`${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    else if (email) window.location.href = `mailto:${email}?subject=${encodeURIComponent(intro)}&body=${encodeURIComponent(text)}`;
  };
  const input = (k: keyof typeof v, label: Bilingual, type = "text", required = true) => (
    <label className="block">
      <span className="font-semibold">{tr(label, lang)}</span>
      <input type={type} required={required} value={v[k]} onChange={(e) => set({ ...v, [k]: e.target.value })} className={field}
        autoComplete={k === "phone" ? "tel" : k === "parent" ? "name" : "off"} />
    </label>
  );
  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      {input("parent", COPY.parent)}
      {input("child", COPY.child)}
      <label className="block">
        <span className="font-semibold">{tr(COPY.classSought, lang)}</span>
        {classes.length > 0 ? (
          <select required value={v.cls} onChange={(e) => set({ ...v, cls: e.target.value })} className={field}>
            <option value="" />
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input required value={v.cls} onChange={(e) => set({ ...v, cls: e.target.value })} className={field} />
        )}
      </label>
      {input("phone", COPY.phone, "tel")}
      <label className="block sm:col-span-2">
        <span className="font-semibold">{tr(COPY.message, lang)}</span>
        <textarea rows={3} value={v.message} onChange={(e) => set({ ...v, message: e.target.value })} className={`${field} py-2`} />
      </label>
      <div className="sm:col-span-2"><button type="submit" className="ds-btn ds-btn-cta">{tr(COPY.send, lang)}</button></div>
    </form>
  );
}
