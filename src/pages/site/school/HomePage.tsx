/**
 * SCHOOL HOME, admission-first (DEMO-SCHOOL-IA.md 5.1). In order, each only
 * with data:
 *   hero        the family's shape; a DATED status chip instead of any ticker
 *               or pop-up; the data object per template (admissions card for
 *               Modern a, programme continuum for Modern b, the newest notice
 *               for Warm a, a session sticker for Warm b, a ruled facts line
 *               for Classic)
 *   proof       trust figures, each with its basis line; each hides alone
 *   notices     hidden when nothing is newer than 60 days
 *   about       excerpt plus the head's typed name and message (no signature)
 *   programmes  stages or age bands, linked to Academics or Programmes
 *   highlight   board results (safety facts for a play school)
 *   life        boarding or student-life teaser
 *   explore     tiles that link to the pages that prove each claim
 *   facilities, gallery of six (real photos only), testimonials (consented)
 *   visit       the closing admissions band: status, Apply, Call, WhatsApp, map
 */

import type { DemoSite } from "@/lib/cms/types";
import { bi, hasBi, tr, trf, withText, type Bilingual } from "@/lib/demo/site/bilingual";
import type { SiteContext, SitePageProps } from "@/lib/demo/site/context";
import { SHELL_COPY } from "@/lib/demo/site/copy";
import type { SchoolPageId } from "@/lib/demo/site/pageSets";
import { admissionStatus, clean, freshNotices, schoolPhotos, Str } from "@/lib/demo/ui/school/shared";
import { Hero } from "../kit/Hero";
import { ArrowRight } from "lucide-react";
import { Reveal, SiteLink } from "../kit/motion";
import { Card, CardGrid, Figure, Section } from "../kit/Section";
import { Action, Bi, Photo } from "../kit/Text";

const COPY = {
  visit: { en: "Visit the school", hi: "School देखने आएँ" },
  proof: { en: "In figures", hi: "आँकड़ों में" },
  notices: { en: "Notice board", hi: "Notice board" },
  allNotices: { en: "All notices and events", hi: "सभी सूचनाएँ और कार्यक्रम" },
  about: { en: "About the school", hi: "School के बारे में" },
  readMore: { en: "Read more about us", hi: "हमारे बारे में और पढ़ें" },
  fromHead: { en: "From the {title}", hi: "{title} की ओर से" },
  programmes: { en: "Classes and programmes", hi: "Classes और कार्यक्रम" },
  seeProgrammes: { en: "See every class in detail", hi: "हर class की पूरी जानकारी" },
  results: { en: "Results", hi: "परिणाम" },
  allResults: { en: "See the full results", hi: "पूरे परिणाम देखें" },
  safety: { en: "Safety and care", hi: "सुरक्षा और देखभाल" },
  moreSafety: { en: "How we keep children safe", hi: "बच्चों की सुरक्षा कैसे होती है" },
  boarding: { en: "Boarding life", hi: "हॉस्टल की ज़िंदगी" },
  moreBoarding: { en: "Inside the boarding houses", hi: "हॉस्टल के अंदर" },
  life: { en: "Beyond the classroom", hi: "कक्षा के बाहर" },
  moreLife: { en: "Student life", hi: "छात्र जीवन" },
  explore: { en: "Everything a parent checks", hi: "अभिभावक जो-जो देखते हैं" },
  facilities: { en: "On campus", hi: "Campus में" },
  seeCampus: { en: "Tour the campus", hi: "Campus देखें" },
  gallery: { en: "A look inside", hi: "अंदर की एक झलक" },
  seeGallery: { en: "Open the gallery", hi: "Gallery खोलें" },
  voices: { en: "What parents say", hi: "अभिभावक क्या कहते हैं" },
  visitTitle: { en: "See an ordinary school day", hi: "School का एक आम दिन देखें" },
  visitBody: { en: "Call or message the office to fix a time to see the school.", hi: "School देखने का समय तय करने के लिए office को call या message करें।" },
  admissionsCard: { en: "Admissions", hi: "Admission" },
  classesOpen: { en: "Classes", hi: "Classes" },
  nextDate: { en: "Next date", hi: "अगली तारीख" },
  continuum: { en: "The programme", hi: "कार्यक्रम" },
  latestNotice: { en: "Latest notice", hi: "ताज़ा सूचना" },
} satisfies Record<string, Bilingual>;

/** What each explore tile says about the page it links to. */
const EXPLORE: { id: SchoolPageId; body: Bilingual }[] = [
  { id: "academics", body: { en: "Stages, subjects and how children are assessed", hi: "Stages, विषय और मूल्यांकन का तरीका" } },
  { id: "programmes", body: { en: "Programmes by age, and a day in the life", hi: "उम्र के हिसाब से कार्यक्रम और दिनचर्या" } },
  { id: "results", body: { en: "Board results, year by year, in full", hi: "साल दर साल पूरे board results" } },
  { id: "faculty", body: { en: "The teachers, their subjects and experience", hi: "शिक्षक, उनके विषय और अनुभव" } },
  { id: "facilities", body: { en: "Rooms, grounds and everyday care", hi: "कक्षाएँ, मैदान और रोज़ की देखभाल" } },
  { id: "boarding", body: { en: "Houses, routine, food and pastoral care", hi: "Houses, दिनचर्या, खाना और देखभाल" } },
  { id: "safety", body: { en: "Pickup, CCTV, staff checks and first aid", hi: "Pickup, CCTV, staff जाँच और first aid" } },
  { id: "transport", body: { en: "Bus routes, stops and timings", hi: "Bus routes, stops और समय" } },
  { id: "parents", body: { en: "Portal, calendar and downloads", hi: "Portal, calendar और downloads" } },
  { id: "disclosure", body: { en: "The CBSE mandatory public disclosure", hi: "CBSE की अनिवार्य सार्वजनिक जानकारी" } },
];

export default function HomePage({ site, ctx }: SitePageProps) {
  const { lang, family, variant } = ctx;
  const stats = withText(site.stats, "label").filter((s) => (s.value || "").trim());
  const statsInHero = family === "modern" && variant === "a";
  const notices = freshNotices(site, ctx.today).slice(0, 3);
  const noticesInHero = family === "warm" && variant === "a" ? 1 : 0;
  const programmes = withText(site.courses, "name");
  const results = withText(site.results, "achievement").slice(0, 3);
  const safety = withText(site.safety, "title").slice(0, 3);
  const headTitle = bi(site, "principalTitle", lang);
  const hasHead = !!(site.principalName || "").trim() && hasBi(site, "principalMessage");
  const progHref = ctx.href("academics") || ctx.href("programmes");
  let n = 0;
  return (
    <>
      <HomeHero site={site} ctx={ctx} />
      {noticesInHero > 0 && <div aria-hidden="true" className="h-12" />}

      {!statsInHero && stats.length > 0 && (
        <Section n={++n} title={tr(COPY.proof, lang)}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {stats.slice(0, 4).map((s, i) => (
              <Reveal key={i} index={i}><Figure value={s.value} label={bi(s, "label", lang)} basis={bi(s, "basis", lang)} /></Reveal>
            ))}
          </div>
        </Section>
      )}

      {notices.length > noticesInHero && (
        <Section n={++n} title={tr(COPY.notices, lang)}>
          <ul className="divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))]">
            {notices.slice(noticesInHero).map((x, i) => (
              <Reveal as="li" key={i} index={i} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <p className="ds-num text-sm font-semibold text-[hsl(var(--ds-accent))]"><Bi of={x} k="date" /></p>
                <div>
                  <Bi of={x} k="title" as="p" className="font-semibold" />
                  <Bi of={x} k="body" as="p" className="mt-1 text-[hsl(var(--ds-ink-soft))]" />
                </div>
              </Reveal>
            ))}
          </ul>
          {ctx.href("news") && <div className="mt-6"><Action href={ctx.href("news")!} tone="ghost">{tr(COPY.allNotices, lang)}</Action></div>}
        </Section>
      )}

      {(hasBi(site, "about") || hasHead) && (
        <Section n={++n} title={tr(COPY.about, lang)}>
          <div className={`grid gap-10 ${hasHead && hasBi(site, "about") ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
            {hasBi(site, "about") && (
              <div>
                <Bi of={site} k="about" as="p" className="max-w-prose text-lg leading-relaxed line-clamp-[8]" />
                {ctx.href("about") && <div className="mt-6"><Action href={ctx.href("about")!} tone="ghost">{tr(COPY.readMore, lang)}</Action></div>}
              </div>
            )}
            {hasHead && (
              <figure className="ds-card p-6">
                <p className="text-sm font-semibold text-[hsl(var(--ds-accent))]">{headTitle ? trf(COPY.fromHead, lang, { title: headTitle }) : ""}</p>
                <blockquote className="mt-3 text-[hsl(var(--ds-ink))]"><Bi of={site} k="principalMessage" as="p" className="line-clamp-[7] leading-relaxed" /></blockquote>
                <figcaption className="mt-4 border-t border-[hsl(var(--ds-line))] pt-3">
                  <span className="ds-display block text-lg">{site.principalName}</span>
                  {headTitle && <span className="text-sm text-[hsl(var(--ds-ink-soft))]">{headTitle}</span>}
                </figcaption>
              </figure>
            )}
          </div>
        </Section>
      )}

      {programmes.length > 0 && (
        <Section n={++n} title={tr(COPY.programmes, lang)}>
          <CardGrid cols={programmes.length === 4 ? 4 : 3}>
            {programmes.map((c, i) => (
              <Reveal key={i} index={i}>
                <Card interactive={!!progHref} className="h-full">
                  <Bi of={c} k="level" as="p" className="text-sm font-semibold text-[hsl(var(--ds-accent))]" />
                  <Bi of={c} k="name" as="p" className="ds-display mt-1 text-xl" />
                  <Bi of={c} k="subjects" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" />
                  <Bi of={c} k="timings" as="p" className="ds-num mt-3 text-sm" />
                </Card>
              </Reveal>
            ))}
          </CardGrid>
          {progHref && <div className="mt-6"><Action href={progHref} tone="ghost">{tr(COPY.seeProgrammes, lang)}</Action></div>}
        </Section>
      )}

      {results.length > 0 ? (
        <Section n={++n} title={bi(site, "resultsHeading", lang) || tr(COPY.results, lang)}>
          <ul className="grid gap-4 sm:grid-cols-3">
            {results.map((r, i) => (
              <Reveal as="li" key={i} index={i} className="ds-card p-5">
                <Bi of={r} k="achievement" as="p" className="ds-display text-xl leading-snug text-[hsl(var(--ds-brand-ink))]" />
                <p className="ds-num mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{[r.exam, r.year].filter(Boolean).join(", ")}</p>
              </Reveal>
            ))}
          </ul>
          <Bi of={site} k="resultsNote" as="p" className="mt-4 max-w-prose text-[hsl(var(--ds-ink-soft))]" />
          {ctx.href("results") && <div className="mt-6"><Action href={ctx.href("results")!} tone="ghost">{tr(COPY.allResults, lang)}</Action></div>}
        </Section>
      ) : safety.length > 0 ? (
        <Section n={++n} title={tr(COPY.safety, lang)}>
          <CardGrid cols={3}>
            {safety.map((p, i) => (
              <Reveal key={i} index={i}><Card className="h-full"><Bi of={p} k="title" as="p" className="ds-display text-lg" /><Bi of={p} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" /></Card></Reveal>
            ))}
          </CardGrid>
          {ctx.href("safety") && <div className="mt-6"><Action href={ctx.href("safety")!} tone="ghost">{tr(COPY.moreSafety, lang)}</Action></div>}
        </Section>
      ) : null}

      <HomeRest site={site} ctx={ctx} start={n} />
    </>
  );
}

function HomeRest({ site, ctx, start }: { site: DemoSite; ctx: SiteContext; start: number }) {
  const { lang } = ctx;
  let n = start;
  const boarding = hasBi(site.boarding, "intro") ? site.boarding : null;
  const life = withText(site.studentLife, "title").slice(0, 3);
  const explore = EXPLORE.map((e) => ({ ...e, href: ctx.href(e.id), label: ctx.pages.find((p) => p.id === e.id)?.label })).filter((e) => e.href && e.label);
  const facilities = clean(site.facilities);
  const photos = schoolPhotos(site).filter((p) => p.src).slice(0, 6);
  const reviews = withText(site.reviews, "quote").filter((r) => r.consent).slice(0, 3);
  const status = admissionStatus(site, lang, ctx.today);
  const apply = ctx.href("admissions");
  const contact = ctx.href("contact");

  return (
    <>
      {(boarding || life.length > 0) && (
        <Section n={++n} title={tr(boarding ? COPY.boarding : COPY.life, lang)}>
          {boarding && <Bi of={boarding} k="intro" as="p" className="mb-6 max-w-prose text-lg" />}
          {life.length > 0 && (
            <CardGrid cols={3}>
              {life.map((p, i) => (
                <Reveal key={i} index={i}><Card className="h-full"><Bi of={p} k="title" as="p" className="ds-display text-lg" /><Bi of={p} k="body" as="p" className="mt-2 text-[hsl(var(--ds-ink-soft))]" /></Card></Reveal>
              ))}
            </CardGrid>
          )}
          {(ctx.href(boarding ? "boarding" : "student-life")) && (
            <div className="mt-6"><Action href={ctx.href(boarding ? "boarding" : "student-life")!} tone="ghost">{tr(boarding ? COPY.moreBoarding : COPY.moreLife, lang)}</Action></div>
          )}
        </Section>
      )}

      {explore.length >= 2 && (
        <Section n={++n} title={tr(COPY.explore, lang)}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((e, i) => (
              <Reveal as="li" key={e.id} index={i}>
                <SiteLink to={e.href!} className="block h-full">
                  <Card interactive className="flex h-full items-start justify-between gap-4">
                    <span>
                      <span className="ds-display block text-lg">{tr(e.label!, lang)}</span>
                      <span className="mt-1 block text-sm text-[hsl(var(--ds-ink-soft))]">{tr(e.body, lang)}</span>
                    </span>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--ds-accent))]" aria-hidden="true" />
                  </Card>
                </SiteLink>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {facilities.length > 0 && (
        <Section n={++n} title={tr(COPY.facilities, lang)}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f, i) => (
              <Reveal as="li" key={f} index={i} className="ds-card flex items-start gap-3 p-4">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--ds-accent))]" />
                <Str text={f} />
              </Reveal>
            ))}
          </ul>
          {ctx.href("facilities") && <div className="mt-6"><Action href={ctx.href("facilities")!} tone="ghost">{tr(COPY.seeCampus, lang)}</Action></div>}
        </Section>
      )}

      {photos.length >= 3 && (
        <Section n={++n} title={tr(COPY.gallery, lang)}>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {photos.map((p, i) => (
              <Reveal as="li" key={p.key} index={i}><Photo src={p.src} alt={bi(p.obj, "alt", lang)} ratio="4 / 3" className="rounded-[var(--ds-radius)]" /></Reveal>
            ))}
          </ul>
          {ctx.href("gallery") && <div className="mt-6"><Action href={ctx.href("gallery")!} tone="ghost">{tr(COPY.seeGallery, lang)}</Action></div>}
        </Section>
      )}

      {reviews.length > 0 && (
        <Section n={++n} title={tr(COPY.voices, lang)}>
          <CardGrid cols={3}>
            {reviews.map((r, i) => (
              <Reveal key={i} index={i}>
                <Card className="h-full">
                  <blockquote><Bi of={r} k="quote" as="p" className="text-lg leading-relaxed" /></blockquote>
                  <p className="mt-4 text-sm font-semibold">{r.name}{r.name && hasBi(r, "relation") ? ", " : ""}<Bi of={r} k="relation" className="font-normal text-[hsl(var(--ds-ink-soft))]" /></p>
                </Card>
              </Reveal>
            ))}
          </CardGrid>
        </Section>
      )}

      <Section n={++n} title={tr(COPY.visitTitle, lang)}>
        {status.text && <p className="ds-display mb-3 text-xl text-[hsl(var(--ds-brand-ink))]">{status.text}</p>}
        <p className="max-w-prose text-lg">{tr(COPY.visitBody, lang)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {apply && <Action href={apply}>{tr(SHELL_COPY.applyNow, lang)}</Action>}
          {ctx.actions.tel && <Action href={ctx.actions.tel} tone="ghost">{tr(SHELL_COPY.call, lang)}</Action>}
          {ctx.actions.whatsapp && <Action href={ctx.actions.whatsapp} tone="ghost">{tr(SHELL_COPY.whatsapp, lang)}</Action>}
          <Action href={contact || ctx.actions.map} tone="ghost">{tr(SHELL_COPY.findUs, lang)}</Action>
        </div>
      </Section>
    </>
  );
}

/* ── Hero: the family owns the shape, this passes the data object ── */

function HomeHero({ site, ctx }: { site: DemoSite; ctx: SiteContext }) {
  const { lang, family, variant, today } = ctx;
  const status = admissionStatus(site, lang, today);
  const apply = ctx.href("admissions");
  const contact = ctx.href("contact");
  const programmes = withText(site.courses, "name");
  const stats = withText(site.stats, "label").filter((s) => (s.value || "").trim());
  const notice = freshNotices(site, today)[0];
  const next = withText(site.admissions?.timeline, "title").find((t) => hasBi(t, "date"));
  const photo = site.heroImage ? { src: site.heroImage, alt: site.instituteName } : undefined;
  const key = `${family}-${variant}`;

  let aside: JSX.Element | undefined;
  let facts: string[] | undefined;
  let sticker: string | undefined;

  if (key === "modern-a") {
    /* The admissions card: session, status, classes, next date, Apply. */
    const has = status.text || hasBi(site, "admissionsHeadline") || programmes.length || next;
    aside = has ? (
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-accent))]">{tr(COPY.admissionsCard, lang)}</p>
        <p className="ds-display mt-2 text-2xl leading-snug">{status.text || <Bi of={site} k="admissionsHeadline" />}</p>
        
        <dl className="mt-4 divide-y divide-[hsl(var(--ds-line))] border-y border-[hsl(var(--ds-line))] text-sm">
          {programmes.length > 0 && (
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.classesOpen, lang)}</dt>
              <dd className="text-right font-semibold">{programmes.slice(0, 4).map((c) => bi(c, "name", lang)).join(", ")}</dd></div>
          )}
          {next && (
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-[hsl(var(--ds-ink-soft))]">{tr(COPY.nextDate, lang)}</dt>
              <dd className="text-right font-semibold"><Bi of={next} k="date" /><span className="block font-normal text-[hsl(var(--ds-ink-soft))]"><Bi of={next} k="title" /></span></dd></div>
          )}
        </dl>
        {apply && <div className="mt-5 [&>a]:w-full"><Action href={apply}>{tr(SHELL_COPY.applyNow, lang)}</Action></div>}
      </div>
    ) : undefined;
    facts = stats.slice(0, 4).map((s) => `${s.value} ${bi(s, "label", lang)}`);
  } else if (key === "modern-b") {
    /* The programme continuum strip pinned to the hero's bottom edge. */
    aside = programmes.length > 1 ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <p className="shrink-0 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--ds-hero-accent))]">{tr(COPY.continuum, lang)}</p>
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {programmes.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-5 bg-[hsl(var(--ds-hero-soft)/0.6)]" />}
              <span className="rounded-full border border-[hsl(var(--ds-hero-soft)/0.5)] px-3 py-1 text-sm font-semibold"><Bi of={c} k="name" /></span>
            </li>
          ))}
        </ol>
      </div>
    ) : status.text ? <p className="text-sm font-semibold">{status.text}</p> : undefined;
  } else if (key === "warm-a") {
    /* The newest notice, overlapping the next section. Else the status. */
    aside = notice ? (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[hsl(var(--ds-accent))]">{tr(COPY.latestNotice, lang)}{hasBi(notice, "date") ? " · " : ""}<Bi of={notice} k="date" /></p>
        <Bi of={notice} k="title" as="p" className="ds-display text-xl" />
        <Bi of={notice} k="body" as="p" className="text-[hsl(var(--ds-ink-soft))] line-clamp-2" />
        {ctx.href("news") && <div className="mt-2"><Action href={ctx.href("news")!} tone="ghost">{tr(COPY.allNotices, lang)}</Action></div>}
      </div>
    ) : status.text ? <p className="ds-display text-xl">{status.text}</p> : undefined;
    facts = status.text && notice ? [status.text] : undefined;
  } else if (key === "warm-b") {
    sticker = bi(site, "sessionLabel", lang) ? `${tr(COPY.admissionsCard, lang)} ${bi(site, "sessionLabel", lang)}` : undefined;
  } else {
    /* Classic: the ruled facts line. */
    facts = [(site.established || "").trim(), status.text].filter(Boolean);
  }

  const eyebrow = family === "classic"
    ? [site.boardOrAffiliation, site.city].filter(Boolean).join(", ")
    : [site.boardOrAffiliation?.split(",")[0], site.city].filter(Boolean).join(" · ");

  return (
    <Hero
      eyebrow={eyebrow || undefined}
      title={site.instituteName}
      lead={<Bi of={site} k="tagline" accent />}
      primary={apply ? <Action href={apply}>{tr(SHELL_COPY.applyNow, lang)}</Action> : undefined}
      secondary={<Action href={contact || ctx.actions.map} tone="ghost">{tr(COPY.visit, lang)}</Action>}
      facts={facts && facts.length ? facts : undefined}
      aside={aside}
      photo={photo}
      sticker={sticker}
    />
  );
}
