/**
 * PEOPLE, in the family's own language. Used by Faculty, About (the head) and
 * the home page's principal block.
 *
 *   classic  a ruled index: name in the display face, subject in small caps,
 *            qualification and experience on one line; a small square
 *            portrait when the row has a photo
 *   modern   4:5 portrait tiles; the photo sits desaturated and takes its
 *            colour on hover (hover devices only)
 *   warm     round portraits, centred, people first
 *
 * A teacher's own photograph prints only with `photoConsent`. A stock
 * portrait (public/demo/img/people, a licensed model the template set) needs
 * no consent and gets its srcset and focal point. Without a photo the tile
 * carries the person's initials. The name sits beside the photo, so its alt
 * is empty.
 */

import type { Ref } from "react";
import type { DemoFaculty } from "@/lib/cms/types";
import { facultyPhotoSrc, getStockPhoto } from "@/lib/demo/images";
import { useSite } from "@/lib/demo/site/context";
import { stockImgProps } from "@/pages/site/kit/DemoPhoto";
import { Reveal } from "@/pages/site/kit/motion";
import { Bi, initials } from "@/pages/site/kit/Text";

/* What each frame gives the image, for the srcset: a 64px square, a 112px
   circle, or a quarter-column tile. */
const SIZES = { square: "64px", round: "112px", portrait: "(min-width: 1024px) 260px, 45vw", band: "100vw" } as const;

function Face({ person, shape }: { person: DemoFaculty; shape: "square" | "portrait" | "round" | "band" }) {
  const { lang } = useSite();
  const photo = facultyPhotoSrc(person) || "";
  const stock = getStockPhoto(photo);
  const box =
    shape === "band" ? "h-20 w-full !justify-start px-4 border-b border-[hsl(var(--ds-line))]" : shape === "round" ? "h-28 w-28 rounded-full" : shape === "square" ? "h-16 w-16 rounded-[2px]" : "aspect-[4/5] w-full rounded-[calc(var(--ds-radius)-2px)]";
  if (photo) {
    return (
      <div className={`ds-face overflow-hidden bg-[hsl(var(--ds-surface-2))] ${box}`}>
        <img
          {...(stock ? stockImgProps(stock, { lang, sizes: SIZES[shape], decorative: true }) : { src: photo, alt: "", loading: "lazy" as const, decoding: "async" as const })}
          style={stock ? { objectPosition: stock.objectPosition } : undefined}
          className={`h-full w-full object-cover ${shape === "portrait" ? "transition-[filter] duration-200 [@media(hover:hover)]:grayscale-[60%] [@media(hover:hover)]:group-hover:grayscale-0" : ""}`} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`flex items-center justify-center bg-[hsl(var(--ds-surface-2))] text-[hsl(var(--ds-brand-ink))] ${box} ${shape === "square" ? "border border-[hsl(var(--ds-line))]" : ""}`}>
      <span className={`ds-display ${shape === "portrait" ? "text-5xl" : shape === "round" || shape === "band" ? "text-3xl" : "text-lg"}`}>{initials(person.name)}</span>
    </div>
  );
}

function Lines({ p, center }: { p: DemoFaculty; center?: boolean }) {
  return (
    <div className={center ? "text-center" : undefined}>
      <Bi of={p} k="role" as="p" className="text-sm font-semibold text-[hsl(var(--ds-accent))]" />
      <Bi of={p} k="subject" as="p" className="text-[hsl(var(--ds-ink))]" />
      <Bi of={p} k="qualification" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
      <Bi of={p} k="experience" as="p" className="text-sm text-[hsl(var(--ds-ink-soft))]" />
      <Bi of={p} k="note" as="p" className="mt-2 text-sm text-[hsl(var(--ds-ink-soft))]" />
    </div>
  );
}

/** Stable key for a person, for lists and FLIP. */
export const personKey = (p: DemoFaculty, i: number) => `${p.name}-${i}`;

/**
 * A list of people in the family's composition. Each item is an <li data-k>
 * so a filter can FLIP the list through `listRef` (ui/school/filter.tsx).
 */
export function People({ people, listRef, keys }: { people: DemoFaculty[]; listRef?: Ref<HTMLUListElement>; keys?: string[] }) {
  const { family } = useSite();
  if (!people.length) return null;
  const anyPhoto = people.some((p) => facultyPhotoSrc(p));
  const k = (p: DemoFaculty, i: number) => (keys ? keys[i] : personKey(p, i));

  if (family === "classic") {
    return (
      <ul ref={listRef} className="border-b border-[hsl(var(--ds-line))]">
        {people.map((p, i) => (
          <li key={k(p, i)} data-k={k(p, i)}>
            <Reveal index={i} className="ds-card grid grid-cols-[64px_1fr] items-start gap-4 sm:grid-cols-[64px_minmax(0,14rem)_1fr] sm:gap-6">
              <Face person={p} shape="square" />
              <p className="ds-display text-xl leading-snug">{p.name}</p>
              <div className="col-start-2 sm:col-start-3"><Lines p={p} /></div>
            </Reveal>
          </li>
        ))}
      </ul>
    );
  }

  if (family === "modern") {
    return (
      <ul ref={listRef} className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {people.map((p, i) => (
          <li key={k(p, i)} data-k={k(p, i)}>
            <Reveal index={i} className="h-full">
              <div className="ds-card group h-full overflow-hidden p-0" data-interactive="">
                <Face person={p} shape={anyPhoto ? "portrait" : "band"} />
                <div className="p-4">
                  <p className="ds-display text-lg leading-tight">{p.name}</p>
                  <div className="mt-1"><Lines p={p} /></div>
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul ref={listRef} className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
      {people.map((p, i) => (
        <li key={k(p, i)} data-k={k(p, i)}>
          <Reveal index={i} className="h-full">
            <div className="ds-card flex h-full flex-col items-center gap-3 p-6" data-interactive="">
              <Face person={p} shape="round" />
              <p className="ds-display text-xl">{p.name}</p>
              <Lines p={p} center />
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
