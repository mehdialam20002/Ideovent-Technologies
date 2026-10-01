/**
 * THE PHOTOS PANEL of the demo-sites editor: every photo slot in one place.
 *
 *   hero      DemoSite.heroImage
 *   sections  DemoSite.sectionPhotos[slot], the slots of this kind
 *   faculty   DemoSite.faculty[i].photo, one per teacher already listed
 *   gallery   DemoSite.photos[], add from the library (edit them below)
 *
 * Each slot shows its thumbnail and takes an image URL, an upload (the same
 * uploadImage the rest of the admin uses) or a pick from the stock library
 * (public/demo/img, src/lib/demo/images). A duplicate arrives with the
 * template's stock photos; the notice at the top says so until the hero is
 * replaced, because a real institute's demo should open on its own building.
 *
 * A DENTAL record (30 Sep 2026) uses the hero and two section slots (about,
 * and campus for the clinic photo); its doctors' portraits and treatment
 * photos live in the Dental block of the form, with a consent tick for a real
 * dentist's photograph. So this panel points there instead of asking for
 * teachers, and its stock notice counts those photos too (stockPhotoUse).
 */

import { useId, useMemo, useState } from "react";
import { ImageIcon, Images, Trash2, Upload, X } from "lucide-react";
import type { DemoFaculty, DemoPhoto as DemoPhotoRecord, DemoSite } from "@/lib/cms/types";
import { uploadImage } from "@/lib/cms/upload";
import {
  STOCK_PHOTOS,
  STOCK_PHOTO_CHECKLIST,
  getStockPhoto,
  photoSlotsFor,
  stockPhotoUse,
  type DemoPhotoSlot,
  type StockPhoto,
  type StockPhotoRole,
} from "@/lib/demo/images";
import { DemoPhoto } from "@/pages/site/kit/DemoPhoto";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const smallBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/50 disabled:opacity-50";

/** The template code ("s1") of a record made from a template, for ordering the library. */
function templateCode(site: Pick<DemoSite, "templateId">): string {
  return (site.templateId || "").split("-")[0];
}

/** Library photos for a slot: the template's own first, then the rest. */
function libraryFor(role: StockPhotoRole, code: string, categories?: string[]): StockPhoto[] {
  const pool = STOCK_PHOTOS.filter((p) =>
    role === "portrait" ? p.role === "portrait" : role === "hero" ? p.role === "hero" : p.role !== "portrait",
  );
  const score = (p: StockPhoto) =>
    (p.suggestedFor.includes(code) ? 0 : 2) + (categories && !categories.includes(p.category) ? 1 : 0);
  return [...pool].sort((a, b) => score(a) - score(b));
}

function thumbOf(p: StockPhoto): string {
  return p.sizes[p.sizes.length - 1].src;
}

/** A grid of library photos to pick one from. */
function StockPicker({ photos, value, taken, onPick, onClose }: {
  photos: StockPhoto[];
  value?: string;
  /** Photos already used elsewhere on this record (portraits): marked. */
  taken?: Set<string>;
  onPick: (src: string) => void;
  onClose: () => void;
}) {
  const current = getStockPhoto(value)?.id;
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/20 p-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Stock library. The template's own picks come first.</p>
        <button type="button" onClick={onClose} className={smallBtn} aria-label="Close the library">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={current === p.id}
              title={p.alt}
              onClick={() => onPick(p.src)}
              className={cn(
                "relative block w-full overflow-hidden rounded-lg border-2",
                current === p.id ? "border-primary" : "border-transparent hover:border-primary/40",
              )}
            >
              <img src={thumbOf(p)} alt={p.alt} loading="lazy" decoding="async" width={p.sizes[p.sizes.length - 1].w} height={p.sizes[p.sizes.length - 1].h} className="aspect-[4/3] h-auto w-full object-cover" style={{ objectPosition: p.objectPosition }} />
              {taken?.has(p.id) && current !== p.id && (
                <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[10px]">in use</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One slot: thumbnail, URL, upload, library, remove. */
export function PhotoSlot({ label, help, value, onChange, role, library, taken, ratio = "4 / 3" }: {
  label: string;
  help?: string;
  value?: string;
  onChange: (v: string) => void;
  role: StockPhotoRole;
  library: StockPhoto[];
  taken?: Set<string>;
  ratio?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const stock = getStockPhoto(value);
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <div className={cn("shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30", role === "portrait" ? "w-16" : "w-28")}>
          <DemoPhoto
            src={value}
            lang="en"
            ratio={role === "portrait" ? "1 / 1" : ratio}
            sizes={role === "portrait" ? "64px" : "112px"}
            fallback={
              <div className="flex items-center justify-center text-muted-foreground" style={{ aspectRatio: role === "portrait" ? "1 / 1" : ratio }}>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
              </div>
            }
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className="text-sm font-medium">{label}</label>
            {stock && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px]">Stock photo</span>}
          </div>
          {help && <p className="text-xs text-muted-foreground">{help}</p>}
          {stock && <p className="text-xs text-muted-foreground">Shows: {stock.alt}</p>}
          <input id={id} className={inputCls} value={value || ""} placeholder="Image URL, upload, or pick from the library" onChange={(e) => onChange(e.target.value.trim())} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={smallBtn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <Images className="h-3.5 w-3.5" aria-hidden="true" /> Library
            </button>
            <label className={cn(smallBtn, "cursor-pointer")}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  try {
                    onChange(await uploadImage(file));
                  } catch (err) {
                    alert("Upload failed: " + (err as Error).message);
                  } finally {
                    setBusy(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
            {value && (
              <button type="button" className={smallBtn} onClick={() => onChange("")}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <StockPicker
          photos={library}
          value={value}
          taken={taken}
          onPick={(src) => {
            onChange(src);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** The whole panel. `onChange` receives the next record. */
export function DemoPhotoSlots({ site, onChange }: { site: DemoSite; onChange: (next: DemoSite) => void }) {
  const code = templateCode(site);
  const use = stockPhotoUse(site);
  const slots = photoSlotsFor(site.kind);
  const sectionPhotos = site.sectionPhotos || {};
  const faculty: DemoFaculty[] = site.faculty || [];
  const [showAll, setShowAll] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const heroLib = useMemo(() => libraryFor("hero", code), [code]);
  const portraitLib = useMemo(() => libraryFor("portrait", code), [code]);
  const stockIds = (values: (string | undefined)[]) =>
    values.map((v) => getStockPhoto(v)?.id).filter((x): x is StockPhoto["id"] => Boolean(x));
  const portraitIds = stockIds(faculty.map((f) => f.photo));
  const portraitsUsed = new Set<string>(portraitIds);
  const galleryUsed = new Set<string>(stockIds((site.photos || []).map((p) => p.src)));
  const repeated = portraitIds.length > portraitsUsed.size;

  const setSection = (slot: DemoPhotoSlot, v: string) => {
    const next = { ...sectionPhotos, [slot]: v };
    if (!v) delete next[slot];
    onChange({ ...site, sectionPhotos: next });
  };
  const setFacultyPhoto = (i: number, v: string) => {
    onChange({ ...site, faculty: faculty.map((f, j) => (j === i ? { ...f, photo: v } : f)) });
  };
  const addGallery = (src: string) => {
    const cat = getStockPhoto(src)?.category || "";
    const row: DemoPhotoRecord = { src, alt: "", category: cat.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) };
    onChange({ ...site, photos: [...(site.photos || []), row] });
  };

  const shown = showAll ? slots : slots.filter((d) => sectionPhotos[d.slot]);
  const galleryCount = (site.photos || []).filter((p) => p.src).length;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  /* A clinic's portraits are its doctors', kept with each doctor in the Dental block. */
  const dental = site.kind === "dental";
  const stockParts = [
    plural(use.sections.length, "section photo"),
    plural(use.faculty, "portrait"),
    ...(dental ? [plural(use.dental, "treatment or clinic photo")] : []),
    plural(use.gallery, "gallery photo"),
  ];
  const stockList = `${stockParts.slice(0, -1).join(", ")} and ${stockParts[stockParts.length - 1]}`;

  return (
    <section aria-labelledby="demo-photos-h" className="space-y-4 rounded-2xl border border-border p-4">
      <div>
        <h3 id="demo-photos-h" className="text-sm font-semibold">Photos</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {dental
            ? "The hero and a photo for the About page and the clinic. The doctors' portraits and the treatment photos are set in the Dental block below. "
            : "The hero, one photo per section, and the teachers' portraits. "}
          Paste an image URL, upload a file, or pick from the stock library. The page builds the
          responsive sizes itself.
        </p>
      </div>

      {use.total > 0 && (
        <div role="note" className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium">{STOCK_PHOTO_CHECKLIST.en}</p>
          <p className="mt-1 text-muted-foreground">
            {use.hero ? "The hero, " : ""}
            {stockList} are licensed stock, not this {dental ? "clinic" : "institute"}. Replace the hero
            with their own {dental ? "clinic" : "building"} before you send it, and never caption a stock
            photo as their {dental ? "clinic or their dentist" : "campus"}.
          </p>
        </div>
      )}

      <PhotoSlot
        label="Hero"
        help="The first screen. It loads first on a phone, so it is the one photo that is not lazy loaded."
        value={site.heroImage}
        onChange={(v) => onChange({ ...site, heroImage: v })}
        role="hero"
        ratio="16 / 9"
        library={heroLib}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Section photos</p>
          <button type="button" className={smallBtn} onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
            {showAll ? "Show only the filled slots" : `Show all ${slots.length} slots`}
          </button>
        </div>
        {shown.length === 0 && (
          <p className="text-xs text-muted-foreground">No section photos yet. Not every section needs one.</p>
        )}
        {shown.map((d) => (
          <PhotoSlot
            key={d.slot}
            label={d.label}
            help={d.where}
            value={sectionPhotos[d.slot]}
            onChange={(v) => setSection(d.slot, v)}
            role="section"
            library={libraryFor("section", code, d.categories)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{dental && faculty.length === 0 ? "Doctors' portraits" : "Faculty portraits"}</p>
        {faculty.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {dental
              ? `Set with each doctor under "Dental clinic pages", Doctors, Photograph (${plural((site.dental?.doctors || []).length, "doctor")} listed now). A stock portrait needs no consent. A real dentist's photograph shows only with its consent box ticked there.`
              : "Add teachers in the Faculty list below; each one gets a portrait slot here."}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              A stock portrait needs no consent. A teacher's own photograph shows only with consent
              ticked in the Faculty list.
            </p>
            {repeated && (
              <p className="text-xs text-destructive">
                The same stock portrait is used for two teachers. Pick a different one.
              </p>
            )}
            {faculty.map((f, i) => (
              <PhotoSlot
                key={i}
                label={f.name || `Teacher ${i + 1}`}
                value={f.photo}
                onChange={(v) => setFacultyPhoto(i, v)}
                role="portrait"
                library={portraitLib}
                taken={portraitsUsed}
              />
            ))}
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Gallery: {plural(galleryCount, "photo")}</p>
          <button type="button" className={smallBtn} onClick={() => setGalleryOpen((o) => !o)} aria-expanded={galleryOpen}>
            <Images className="h-3.5 w-3.5" aria-hidden="true" /> Add from the library
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Captions, categories and order are edited in "Photographs (with categories)" below.
        </p>
        {galleryOpen && (
          <StockPicker
            photos={libraryFor("section", code)}
            taken={galleryUsed}
            onPick={addGallery}
            onClose={() => setGalleryOpen(false)}
          />
        )}
      </div>
    </section>
  );
}
