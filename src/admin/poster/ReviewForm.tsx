import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  PosterContact, PosterCourse, PosterExtract, PosterFaculty, PosterResult,
} from "@/lib/ai/posterSchema";
import { Field, Section } from "./ui";

/**
 * EVERY FIELD THE POSTER READER RETURNED, EDITABLE, before anything is made.
 *
 * The form edits the extract itself, not the demo, so what Mehdi sees here
 * is exactly what `fromPoster` will overlay, and an empty box means the
 * template's own content stays in that place.
 *
 * LISTS ARE EDITED AS TEXT that round-trips exactly (split on a newline or a
 * comma, joined back with the same character), so typing "Physics, " does
 * not jump the caret. Blank lines and spaces are tidied once, on Create, by
 * normalizeExtract.
 */

type Patch = (p: Partial<PosterExtract>) => void;

const lines = (l: string[] | undefined) => (l || []).join("\n");
const unlines = (s: string) => (s ? s.split("\n") : []);
const commas = (l: string[] | undefined) => (l || []).join(",");
const uncommas = (s: string) => (s ? s.split(",") : []);

const smallButton =
  "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A list of rows (courses, teachers, results) with Add and Remove. */
function Rows<T extends object>({
  noun, items, onChange, render, blank,
}: {
  noun: string;
  items: T[] | undefined;
  onChange: (next: T[]) => void;
  render: (item: T, set: (p: Partial<T>) => void, i: number) => ReactNode;
  blank: T;
}) {
  const list = items || [];
  return (
    <div className="grid gap-3">
      {!list.length && (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          None on the poster, so the template’s own {noun}s stay. Add one to replace them.
        </p>
      )}
      {list.map((item, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {noun[0].toUpperCase() + noun.slice(1)} {i + 1}
            </span>
            <button
              type="button"
              className={smallButton}
              aria-label={`Remove ${noun} ${i + 1}`}
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {render(item, (p) => onChange(list.map((x, j) => (j === i ? { ...x, ...p } : x))), i)}
          </div>
        </div>
      ))}
      <button type="button" className={`${smallButton} justify-self-start`} onClick={() => onChange([...list, { ...blank }])}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a {noun}
      </button>
    </div>
  );
}

/** The whole form. `x` is the extract as edited so far. */
export function ReviewForm({ x, onChange }: { x: PosterExtract; onChange: (next: PosterExtract) => void }) {
  const set: Patch = (p) => onChange({ ...x, ...p });
  const contact = x.contact || {};
  const setContact = (p: Partial<PosterContact>) => set({ contact: { ...contact, ...p } });
  const adm = x.admissions || {};
  const phones = contact.phones || [];

  return (
    <div className="grid gap-4">
      <Section title="The institute">
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-medium text-muted-foreground">Kind</legend>
            <div className="mt-1 flex gap-4 text-sm">
              {(["school", "coaching"] as const).map((k) => (
                <label key={k} className="inline-flex items-center gap-2">
                  <input type="radio" name="poster-kind" value={k} checked={x.kind === k} onChange={() => set({ kind: k })} />
                  {k === "school" ? "School" : "Coaching"}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="px-name" label="Institute name (required)" value={x.instituteName} onChange={(v) => set({ instituteName: v })} placeholder="Not read: type it as the poster spells it" />
          <Field id="px-name-hi" label="Hindi name" lang="hi" value={x.instituteNameHi} onChange={(v) => set({ instituteNameHi: v })} />
          <Field id="px-tagline" label="Tagline" className="sm:col-span-2" value={x.tagline} onChange={(v) => set({ tagline: v })} />
          <Field id="px-city" label="City" value={x.city} onChange={(v) => set({ city: v })} />
          <Field id="px-state" label="State" value={x.state} onChange={(v) => set({ state: v })} />
          <Field id="px-locality" label="Locality" value={x.locality} onChange={(v) => set({ locality: v })} />
          <Field id="px-board" label="Board or affiliation" value={x.board} onChange={(v) => set({ board: v })} hint="Only as printed. An affiliation number is checkable, so never guess one." />
          <Field id="px-classes" label="Classes" value={x.classes} onChange={(v) => set({ classes: v })} />
          <Field id="px-established" label="Established" value={x.established} onChange={(v) => set({ established: v })} />
          <Field id="px-exams" label="Exams (comma separated)" value={commas(x.exams)} onChange={(v) => set({ exams: uncommas(v) })} />
          <Field id="px-focus" label="Focus areas (comma separated)" value={commas(x.focusAreas)} onChange={(v) => set({ focusAreas: uncommas(v) })} />
          <Field id="px-facilities" label="Facilities (one per line)" multiline value={lines(x.facilities)} onChange={(v) => set({ facilities: unlines(v) })} />
          <Field id="px-offers" label="Offers (one per line)" multiline value={lines(x.offers)} onChange={(v) => set({ offers: unlines(v) })} hint="The first becomes a pinned notice." />
        </div>
      </Section>

      <Section title="Contact, from the poster">
        <div className="grid gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground" id="px-phones-label">Phone numbers</p>
            <div className="mt-1 grid gap-2" role="group" aria-labelledby="px-phones-label">
              {!phones.length && (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">Not on the poster.</p>
              )}
              {phones.map((p, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field id={`px-phone-${i}`} label={i === 0 ? "Phone (shown on the site)" : `Phone ${i + 1} (kept in private notes)`} className="flex-1" type="tel" value={p} onChange={(v) => setContact({ phones: phones.map((q, j) => (j === i ? v : q)) })} />
                  <button type="button" className="mb-0.5 rounded-full border border-border p-2 hover:bg-muted" aria-label={`Remove phone ${i + 1}`} onClick={() => setContact({ phones: phones.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button type="button" className={`${smallButton} justify-self-start`} onClick={() => setContact({ phones: [...phones, ""] })}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add a phone
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="px-whatsapp" label="WhatsApp" type="tel" value={contact.whatsapp} onChange={(v) => setContact({ whatsapp: v })} />
            <Field id="px-email" label="Email" type="email" value={contact.email} onChange={(v) => setContact({ email: v })} />
            <Field id="px-website" label="Website" value={contact.website} onChange={(v) => setContact({ website: v })} />
            <Field id="px-address" label="Address" multiline value={contact.address} onChange={(v) => setContact({ address: v })} />
          </div>
        </div>
      </Section>

      <Section title="Admissions">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={adm.open === true} onChange={(e) => set({ admissions: { ...adm, open: e.target.checked || undefined } })} />
            The poster says admissions are open
          </label>
          <Field id="px-adm-dates" label="Dates" value={adm.dates} onChange={(v) => set({ admissions: { ...adm, dates: v } })} />
          <Field id="px-adm-note" label="Note" value={adm.note} onChange={(v) => set({ admissions: { ...adm, note: v } })} />
        </div>
      </Section>

      <CoursesFacultyResults x={x} set={set} />

      {x.notes && (
        <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">The reader’s note:</strong> {x.notes}
        </p>
      )}
    </div>
  );
}

function CoursesFacultyResults({ x, set }: { x: PosterExtract; set: Patch }) {
  return (
    <>
      <Section title="Courses or batches">
        <Rows<PosterCourse>
          noun="course"
          items={x.courses}
          onChange={(courses) => set({ courses })}
          blank={{ name: "" }}
          render={(c, up, i) => (
            <>
              <Field id={`px-c${i}-name`} label="Name" value={c.name} onChange={(v) => up({ name: v })} />
              <Field id={`px-c${i}-level`} label="Level or class" value={c.level} onChange={(v) => up({ level: v })} />
              <Field id={`px-c${i}-subjects`} label="Subjects (comma separated)" value={commas(c.subjects)} onChange={(v) => up({ subjects: uncommas(v) })} />
              <Field id={`px-c${i}-duration`} label="Duration" value={c.duration} onChange={(v) => up({ duration: v })} />
              <Field id={`px-c${i}-fee`} label="Fee" value={c.fee} onChange={(v) => up({ fee: v })} />
              <Field id={`px-c${i}-feenote`} label="Fee note" value={c.feeNote} onChange={(v) => up({ feeNote: v })} />
              <Field id={`px-c${i}-timings`} label="Timings" value={c.timings} onChange={(v) => up({ timings: v })} />
              <Field id={`px-c${i}-start`} label="Batch starts" value={c.batchStart} onChange={(v) => up({ batchStart: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Teachers">
        <Rows<PosterFaculty>
          noun="teacher"
          items={x.faculty}
          onChange={(faculty) => set({ faculty })}
          blank={{ name: "" }}
          render={(f, up, i) => (
            <>
              <Field id={`px-f${i}-name`} label="Name" value={f.name} onChange={(v) => up({ name: v })} />
              <Field id={`px-f${i}-subject`} label="Subject" value={f.subject} onChange={(v) => up({ subject: v })} />
              <Field id={`px-f${i}-qual`} label="Qualification" value={f.qualification} onChange={(v) => up({ qualification: v })} />
              <Field id={`px-f${i}-exp`} label="Experience" value={f.experience} onChange={(v) => up({ experience: v })} />
            </>
          )}
        />
      </Section>

      <Section title="Results">
        {!!x.results?.length && (
          <p className="text-xs text-muted-foreground">
            Results from the poster are the institute’s own claims, so the demo is marked “Results and reviews
            on this demo are the institute’s real ones”, and the template’s sample reviews and figures are left out.
            A student’s name prints only after you tick consent on that result.
          </p>
        )}
        <Rows<PosterResult>
          noun="result"
          items={x.results}
          onChange={(results) => set({ results })}
          blank={{ rank: "" }}
          render={(r, up, i) => (
            <>
              <Field id={`px-r${i}-student`} label="Student" value={r.student} onChange={(v) => up({ student: v })} />
              <Field id={`px-r${i}-rank`} label="Rank" value={r.rank} onChange={(v) => up({ rank: v })} />
              <Field id={`px-r${i}-score`} label="Score" value={r.score} onChange={(v) => up({ score: v })} />
              <Field id={`px-r${i}-exam`} label="Exam" value={r.exam} onChange={(v) => up({ exam: v })} />
              <Field id={`px-r${i}-year`} label="Year" value={r.year} onChange={(v) => up({ year: v })} />
            </>
          )}
        />
      </Section>
    </>
  );
}
