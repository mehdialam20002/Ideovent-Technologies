/**
 * COACHING CARDS shared by the home page and the subpages. The family decides
 * the look through the kit's <Card> and coaching.css; these components never
 * branch on the family for layout beyond the portrait frame.
 *
 *   ResultCard   one named or unnamed result with the CCPA 2024 fields: the
 *                course taken, its duration and whether it was paid, at body
 *                size. A name or photo only with consent.
 *   CountCard    selection counts per exam per year (c5, Veranda pattern).
 *   FacultyCard  portrait (square tile, circle, or the classic ruled row
 *                with a small photo) plus facts; stock portraits need no
 *                consent flag, an own photo still does.
 *   ReviewCard   a quote with the person's relation; a video is a poster
 *                that loads only on tap.
 */

import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import type { DemoFaculty, DemoResult, DemoReview } from "@/lib/cms/types";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { Card } from "@/pages/site/kit/Section";
import { Bi, initials } from "@/pages/site/kit/Text";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { facultyPhotoSrc } from "@/lib/demo/images";
import { C_COPY } from "./copy";
import "./coaching.css";

/** "Paid course" / "On scholarship" / "Free course", or "". */
export function paidLabel(r: DemoResult, lang: "en" | "hi"): string {
  if (!r.paid) return "";
  return tr(r.paid === "paid" ? C_COPY.paid : r.paid === "scholarship" ? C_COPY.scholarship : C_COPY.free, lang);
}

/**
 * A square or round portrait, or the initials of the person. Shown only with
 * `consent`; FacultyCard passes it for a stock portrait (a licensed model,
 * see facultyPhotoSrc). A stock photo gets its srcset and the manifest's alt;
 * an own file keeps the person's name as alt.
 */
export function Portrait({ name, src, consent, ratio = "1 / 1", sizes, className }: {
  name: string; src?: string; consent?: boolean; ratio?: string; sizes?: string; className?: string;
}) {
  const shown = src && consent ? src : undefined;
  const badge = <span aria-hidden="true" className="ds-display text-2xl text-[hsl(var(--ds-brand-ink))]">{initials(name)}</span>;
  return (
    <div className={`dsc-portrait flex items-center justify-center ${className || ""}`} style={{ aspectRatio: ratio }}>
      {shown
        ? <DemoPhoto src={shown} alt={name} ratio="auto" sizes={sizes} fallback={badge} />
        : badge}
    </div>
  );
}

export function ResultCard({ r, showQuote }: { r: DemoResult; showQuote?: boolean }) {
  const { lang } = useSite();
  const named = r.consent && (r.studentName || "").trim();
  const meta = [bi(r, "courseName", lang), r.courseDuration, paidLabel(r, lang)].filter(Boolean).join(", ");
  return (
    <Card className="flex h-full gap-4">
      {named ? <Portrait name={r.studentName!} src={r.photo} consent={r.photoConsent} ratio="1 / 1" className="h-16 w-16 shrink-0" /> : null}
      <div className="min-w-0">
        <Bi of={r} k="achievement" as="p" className="ds-display ds-num text-2xl leading-tight" />
        <p className="mt-1 text-sm text-[hsl(var(--ds-ink-soft))]">{[r.exam, r.year].filter(Boolean).join("  ·  ")}</p>
        {named && <p className="mt-2 font-semibold">{r.studentName}</p>}
        {meta && <p className="mt-2">{meta}</p>}
        {showQuote && r.consent && bi(r, "quote", lang) && <Bi of={r} k="quote" as="p" className="mt-3 italic text-[hsl(var(--ds-ink-soft))]" />}
      </div>
    </Card>
  );
}

/** "Final" / "Provisional" is our fixed vocabulary, so it follows the reader's language; anything else prints as typed. */
function statusLabel(status: string, lang: "en" | "hi"): string {
  const k = status.trim().toLowerCase();
  return k === "final" ? tr(C_COPY.final, lang) : k === "provisional" ? tr(C_COPY.provisional, lang) : status;
}

export function CountCard({ r }: { r: DemoResult }) {
  const { lang } = useSite();
  /* "23 selected" under a big 23 says the number twice: drop an achievement that only repeats the count. */
  const ach = (bi(r, "achievement", lang) || "").trim();
  const echo = !!r.count && ach.startsWith(r.count.trim()) && ach.length <= r.count.trim().length + 14;
  return (
    <Card className="h-full">
      <p className="text-sm font-semibold text-[hsl(var(--ds-accent))]">{[r.exam, r.year].filter(Boolean).join("  ·  ")}</p>
      <p className="ds-display ds-num mt-1 text-4xl">{r.count}</p>
      <p className="text-[hsl(var(--ds-ink-soft))]">{tr(C_COPY.selections, lang)}{r.status ? `  ·  ${statusLabel(r.status, lang)}` : ""}</p>
      {!echo && <Bi of={r} k="achievement" as="p" className="mt-2" />}
      {(r.courseName || r.courseDuration || r.paid) && (
        <p className="mt-2 text-sm">{[bi(r, "courseName", lang), r.courseDuration, paidLabel(r, lang)].filter(Boolean).join(", ")}</p>
      )}
    </Card>
  );
}

export function FacultyCard({ f, detail, footer }: { f: DemoFaculty; detail?: boolean; footer?: ReactNode }) {
  const { family } = useSite();
  const photo = facultyPhotoSrc(f);
  /* Classic: the ruled index, a small square photo beside the name. Modern: a
     square tile. Warm: a round portrait. No photo: an initials badge beside
     the name, never a big empty tile. */
  const row = family === "classic" || !photo;
  const small = family === "classic" && photo ? "h-20 w-20 shrink-0" : "h-16 w-16 shrink-0";
  return (
    <Card interactive className={`h-full ${row ? "flex gap-5" : ""}`}>
      <Portrait
        name={f.name}
        src={photo}
        consent
        ratio="1 / 1"
        sizes={row ? "80px" : family === "warm" ? "128px" : "(min-width: 1024px) 260px, (min-width: 640px) 45vw, calc(100vw - 64px)"}
        className={row ? small : family === "warm" ? "mx-auto h-32 w-32" : "w-full"}
      />
      <div className={row ? "min-w-0" : family === "warm" ? "mt-4 text-center" : "mt-4"}>
        <p className="ds-display text-lg">{f.name}</p>
        <Bi of={f} k="subject" as="p" className="font-semibold text-[hsl(var(--ds-accent))]" />
        <Bi of={f} k="role" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
        <Bi of={f} k="qualification" as="p" className="mt-2 text-sm" />
        <Bi of={f} k="experience" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
        {detail && <Bi of={f} k="style" as="p" className="mt-3" />}
        {detail && f.batches && <p className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]">{f.batches}</p>}
        {footer}
      </div>
    </Card>
  );
}

export function ReviewCard({ r }: { r: DemoReview }) {
  const { lang } = useSite();
  const [play, setPlay] = useState(false);
  const who = [r.name, bi(r, "relation", lang)].filter(Boolean).join(", ");
  const embed = r.videoUrl ? youtubeEmbed(r.videoUrl) : null;
  return (
    <figure className="flex h-full flex-col">
      <Card className="dsc-speech flex-1">
        {r.videoUrl && (
          play && embed
            ? <iframe src={embed} title={who || "video"} className="mb-4 aspect-video w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            : (
              <button type="button" onClick={() => (embed ? setPlay(true) : window.open(r.videoUrl, "_blank", "noopener"))}
                className="mb-4 flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-ink))]">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--ds-brand))] text-[hsl(var(--ds-on-brand))]"><Play className="h-6 w-6" aria-hidden="true" /></span>
                <span className="font-semibold">{tr(C_COPY.watchVideo, lang)}</span>
                <span className="text-sm text-[hsl(var(--ds-ink-soft))]">{tr(C_COPY.videoNote, lang)}</span>
              </button>
            )
        )}
        {r.rating && <p className="ds-num text-[hsl(var(--ds-accent))]" aria-label={`${r.rating} / 5`}>{"★".repeat(Math.round(Number(r.rating) || 0))}</p>}
        <blockquote><Bi of={r} k="quote" as="p" className="text-lg leading-relaxed" /></blockquote>
      </Card>
      {who && <figcaption className="mt-5 px-2 text-sm font-semibold">{who}{r.source ? <span className="font-normal text-[hsl(var(--ds-ink-soft))]">  ·  {r.source}</span> : null}</figcaption>}
    </figure>
  );
}

/** The Google-style rating line: only with its count and a link to the profile. */
export function RatingLine() {
  const { site, lang } = useSite();
  const r = site.rating;
  if (!r || !r.value || !r.count || !r.url) return null;
  return (
    <span className="block text-base text-[hsl(var(--ds-ink-soft))]">
      {trf(C_COPY.rating, lang, { value: r.value, count: r.count, source: r.source || "Google" })}{" "}
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{tr(C_COPY.seeProfile, lang)}</a>
    </span>
  );
}

function youtubeEmbed(url: string): string | null {
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1` : null;
}
