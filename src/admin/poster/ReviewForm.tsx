import type { PosterCourse, PosterFaculty, PosterResult } from "@/lib/ai/posterSchema";
import { toKind, type PosterDraft } from "@/lib/ai/dentalPosterSchema";
import { ContactSection, Field, KindPicker, Rows, Section } from "./ui";
import { commas, lines, uncommas, unlines } from "./listText";
import { DentalReviewForm } from "./DentalReviewForm";

/**
 * EVERY FIELD THE POSTER READER RETURNED, EDITABLE, before anything is made.
 *
 * The form edits the extract itself, not the demo, so what Mehdi sees here
 * is exactly what `fromPoster` will overlay, and an empty box means the
 * template's own content stays in that place.
 *
 * A DENTAL CLINIC (28 Sep 2026) gets its own form (./DentalReviewForm.tsx):
 * doctors, treatments, timings and fees instead of courses and results.
 * The Kind switch moves between the two and keeps what was typed.
 *
 * Lists are edited as text that round-trips exactly (see ./listText.ts). Blank
 * lines and spaces are tidied once, on Create, by the normaliser.
 */

type Patch = (p: Partial<PosterDraft>) => void;

/** The whole form. `x` is the extract as edited so far. */
export function ReviewForm({ x, onChange }: { x: PosterDraft; onChange: (next: PosterDraft) => void }) {
  if (x.kind === "dental") return <DentalReviewForm x={x} onChange={onChange} />;
  const set: Patch = (p) => onChange({ ...x, ...p });
  const adm = x.admissions || {};

  return (
    <div className="grid gap-4">
      <Section title="The institute">
        <div className="grid gap-3 sm:grid-cols-2">
          <KindPicker value={x.kind} onChange={(k) => onChange(toKind(x, k))} />
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

      <ContactSection contact={x.contact} onChange={(contact) => set({ contact })} />

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

function CoursesFacultyResults({ x, set }: { x: PosterDraft; set: Patch }) {
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
