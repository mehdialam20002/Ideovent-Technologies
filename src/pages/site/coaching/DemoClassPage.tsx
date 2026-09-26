/**
 * FREE DEMO CLASS LANDING PAGE. /demo-class  (a still page: no reveals)
 *
 *   what      what happens in the demo: the record's trial heading, body,
 *             duration and what to bring
 *   form      five short fields (student name, WhatsApp number, class,
 *             course, optional parent name). Submitting OPENS WHATSAPP with
 *             the message typed out; nothing is stored or sent anywhere
 *             else. Without a WhatsApp number the form is replaced by Call.
 *             Success draws a check mark once (320ms).
 *   steps     three steps and two questions
 */

import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { bi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import { PageHead } from "../kit/Hero";
import { Card, Section } from "../kit/Section";
import { Accordion, Action, Bi } from "../kit/Text";
import "@/lib/demo/ui/coaching/coaching.css";

const COPY = {
  title: { en: "Book a free demo class", hi: "फ्री डेमो क्लास बुक करें" },
  lead: { en: "Sit in a real class, meet the teacher, then decide. It costs nothing.", hi: "असली class में बैठें, टीचर से मिलें, फिर फैसला करें। कोई फीस नहीं।" },
  what: { en: "What happens in the demo", hi: "डेमो में क्या होता है" },
  duration: { en: "How long", hi: "कितनी देर" },
  bring: { en: "What to bring", hi: "क्या लाना है" },
  form: { en: "Your details", hi: "आपकी जानकारी" },
  formNote: { en: "Tapping the button opens WhatsApp with this message. Nothing is saved on this site.", hi: "Button दबाने पर यह message WhatsApp में खुलेगा। इस site पर कुछ save नहीं होता।" },
  student: { en: "Student's name", hi: "Student का नाम" },
  phone: { en: "WhatsApp number", hi: "WhatsApp नंबर" },
  phoneHint: { en: "10 digits", hi: "10 अंक" },
  klass: { en: "Class", hi: "Class" },
  course: { en: "Course", hi: "कोर्स" },
  parent: { en: "Parent's name (optional)", hi: "अभिभावक का नाम (ज़रूरी नहीं)" },
  choose: { en: "Choose", hi: "चुनें" },
  send: { en: "Send on WhatsApp", hi: "WhatsApp पर भेजें" },
  sent: { en: "WhatsApp has opened with your message. Press send there, and the institute will reply with a time.", hi: "आपका message WhatsApp में खुल गया है। वहाँ send दबाएँ, संस्थान समय बताकर जवाब देगा।" },
  noWa: { en: "Call to book a time. The demo class is free.", hi: "समय तय करने के लिए कॉल करें। डेमो class free है।" },
  msg: { en: "Free demo class request\nStudent: {student}\nClass: {klass}\nCourse: {course}\nWhatsApp: {phone}{parent}", hi: "फ्री डेमो class के लिए\nStudent: {student}\nClass: {klass}\nकोर्स: {course}\nWhatsApp: {phone}{parent}" },
  msgParent: { en: "\nParent: {parent}", hi: "\nअभिभावक: {parent}" },
  steps: { en: "After you send it", hi: "भेजने के बाद" },
  s1: { en: "The institute replies on WhatsApp with a batch and a time.", hi: "संस्थान WhatsApp पर batch और समय बताएगा।" },
  s2: { en: "The student sits in a real class with the regular batch.", hi: "Student regular batch के साथ असली class में बैठेगा।" },
  s3: { en: "You meet the teacher, see the fee in writing, and decide at home.", hi: "टीचर से मिलें, फीस लिखित में देखें, और घर जाकर फैसला करें।" },
  q1: { en: "Do we have to pay anything for the demo?", hi: "क्या डेमो के लिए कुछ देना होगा?" },
  a1: { en: "No. The demo class is free, and there is no pressure to join on the day.", hi: "नहीं। डेमो class free है, उसी दिन join करने का कोई दबाव नहीं।" },
  q2: { en: "Can a parent come along?", hi: "क्या अभिभावक साथ आ सकते हैं?" },
  a2: { en: "Yes. A parent can meet the teacher after the class.", hi: "हाँ। Class के बाद अभिभावक टीचर से मिल सकते हैं।" },
} satisfies Record<string, Bilingual>;

const CLASSES: Bilingual[] = [
  ...[6, 7, 8, 9, 10, 11, 12].map((c) => ({ en: `Class ${c}`, hi: `कक्षा ${c}` })),
  { en: "Class 12 passed", hi: "12वीं पास" },
  { en: "Graduate", hi: "Graduate" },
];

export default function DemoClassPage({ site, ctx }: SitePageProps) {
  const { lang } = ctx;
  const trial = site.trial;
  const courses = withText(site.courses, "name");
  const [done, setDone] = useState<"" | "draw" | "done">("");
  const wa = ctx.actions.whatsapp;
  const field = "mt-1 block min-h-[48px] w-full rounded-[var(--ds-radius)] border border-[hsl(var(--ds-line))] bg-[hsl(var(--ds-surface))] px-3 text-base text-[hsl(var(--ds-ink))]";

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const get = (k: string) => String(d.get(k) || "").trim();
    const parent = get("parent");
    const text = trf(COPY.msg, lang, {
      student: get("student"), klass: get("klass"), course: get("course") || "-", phone: get("phone"),
      parent: parent ? trf(COPY.msgParent, lang, { parent }) : "",
    });
    if (wa) window.open(`${wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setDone("draw");
    requestAnimationFrame(() => requestAnimationFrame(() => setDone("done")));
  };

  return (
    <>
      <Helmet><title>{`${tr(COPY.title, lang)} | ${site.instituteName}`}</title></Helmet>
      <PageHead
        title={bi(trial, "heading", lang) || tr(COPY.title, lang)}
        lead={tr(COPY.lead, lang)}
        crumbs={[{ label: tr(SHELL_COPY.home, lang), href: ctx.href("home") }, { label: tr(COPY.title, lang) }]}
      />
      <Section n={1} title={tr(wa ? COPY.form : COPY.what, lang)}>
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          {wa ? (
            <Card>
              {done ? (
                <div role="status" className="flex items-start gap-4">
                  <svg className="dsc-check h-12 w-12 shrink-0 text-[hsl(var(--ds-accent))]" data-draw={done} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                  <p className="text-lg">{tr(COPY.sent, lang)}</p>
                </div>
              ) : (
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">{tr(COPY.student, lang)}
                    <input name="student" required autoComplete="off" className={field} />
                  </label>
                  <label>{tr(COPY.phone, lang)}
                    <input name="phone" required type="tel" inputMode="numeric" pattern="[0-9 +]{10,15}" autoComplete="tel" placeholder={tr(COPY.phoneHint, lang)} className={field} />
                  </label>
                  <label>{tr(COPY.klass, lang)}
                    <select name="klass" required defaultValue="" className={field}>
                      <option value="" disabled>{tr(COPY.choose, lang)}</option>
                      {CLASSES.map((c) => <option key={c.en} value={tr(c, lang)}>{tr(c, lang)}</option>)}
                    </select>
                  </label>
                  {courses.length > 0 && (
                    <label className="sm:col-span-2">{tr(COPY.course, lang)}
                      <select name="course" defaultValue="" className={field}>
                        <option value="">{tr(COPY.choose, lang)}</option>
                        {courses.map((c) => <option key={c.name} value={bi(c, "name", lang)}>{bi(c, "name", lang)}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="sm:col-span-2">{tr(COPY.parent, lang)}
                    <input name="parent" autoComplete="off" className={field} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className="ds-btn ds-btn-cta w-full sm:w-auto">{tr(COPY.send, lang)}</button>
                    <p className="mt-3 text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.formNote, lang)}</p>
                  </div>
                </form>
              )}
            </Card>
          ) : (
            <Card>
              <p className="text-lg">{tr(COPY.noWa, lang)}</p>
              {ctx.actions.tel && <div className="mt-4"><Action href={ctx.actions.tel}>{tr(SHELL_COPY.call, lang)}</Action></div>}
            </Card>
          )}
          <div>
            {wa && <p className="ds-display text-xl">{tr(COPY.what, lang)}</p>}
            <Bi of={trial} k="body" as="p" className="mt-2" />
            <dl className="mt-4 space-y-3">
              {bi(trial, "duration", lang) && <div><dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.duration, lang)}</dt><dd><Bi of={trial} k="duration" /></dd></div>}
              {bi(trial, "bring", lang) && <div><dt className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(COPY.bring, lang)}</dt><dd><Bi of={trial} k="bring" /></dd></div>}
            </dl>
            <p className="ds-display mt-8 text-xl">{tr(COPY.steps, lang)}</p>
            <ol className="mt-3 space-y-3">
              {[COPY.s1, COPY.s2, COPY.s3].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="ds-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--ds-brand))] text-sm font-semibold text-[hsl(var(--ds-on-brand))]">{i + 1}</span>
                  <span className="pt-1">{tr(s, lang)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <Accordion title={tr(COPY.q1, lang)}>{tr(COPY.a1, lang)}</Accordion>
              <Accordion title={tr(COPY.q2, lang)}>{tr(COPY.a2, lang)}</Accordion>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
