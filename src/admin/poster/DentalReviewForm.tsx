import { AlertTriangle } from "lucide-react";
import {
  CLAIM_REASON, dentalClaimIssue, specialisationIssue, toKind,
  type ClaimIssue, type PosterDoctor, type PosterDraft, type PosterFee,
} from "@/lib/ai/dentalPosterSchema";
import { ContactSection, Field, KindPicker, Rows, Section } from "./ui";
import { lines, unlines } from "./listText";

/**
 * A DENTAL CLINIC'S POSTER, BANNER OR VISITING CARD, EDITABLE (28 Sep 2026).
 *
 * The clinic twin of ReviewForm: name, area, treatments, timings, doctors
 * and fees, then what the Dental Council code keeps off the page. A line
 * that would be left out says so under its own box as Mehdi types, with the
 * reason, so he can rephrase it ("Painless RCT" to "Root canal treatment")
 * before the demo is made. fromPoster applies the same test, so what is
 * flagged here is exactly what stays off. Offers are never printed.
 */

type Patch = (p: Partial<PosterDraft>) => void;

/** "Left out: ..." under a box, or nothing. */
function warn(issue: ClaimIssue | null) {
  if (!issue) return undefined;
  return (
    <span className="flex gap-1.5 text-warning">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Left out of the demo: {CLAIM_REASON[issue]}.</span>
    </span>
  );
}

/**
 * Every line the demo will leave out, with its reason, in the order of the
 * form. The same tests, on the same fields, in the same way as
 * fromDentalPoster (src/lib/demo/templates/fromPoster.ts): a doctor whose
 * name is flagged is left out whole, and a fee row counts only once it has
 * both a treatment and a fee.
 */
function leftOutLines(x: PosterDraft): { line: string; issue: ClaimIssue }[] {
  const out: { line: string; issue: ClaimIssue }[] = [];
  const add = (line: string | undefined, test: (t: string) => ClaimIssue | null = dentalClaimIssue) => {
    const t = (line || "").trim();
    const issue = t ? test(t) : null;
    if (issue) out.push({ line: t, issue });
    return !issue;
  };
  add(x.tagline);
  for (const t of x.treatments || []) add(t);
  for (const d of x.doctors || []) {
    if (!(d.name || "").trim() || !add(d.name)) continue;
    add(d.degrees);
    add(d.specialisation, specialisationIssue);
    add(d.registration);
    add(d.experience);
    add(d.days);
  }
  for (const f of x.fees || []) {
    if ((f.treatment || "").trim() && (f.fee || "").trim()) add([f.treatment, f.fee, f.unit].map((v) => (v || "").trim()).filter(Boolean).join(" "));
  }
  for (const o of x.offers || []) if (o.trim()) out.push({ line: o.trim(), issue: "inducement" });
  return out;
}

export function DentalReviewForm({ x, onChange }: { x: PosterDraft; onChange: (next: PosterDraft) => void }) {
  const set: Patch = (p) => onChange({ ...x, ...p });
  const flaggedTreatments = (x.treatments || []).filter((t) => dentalClaimIssue(t));
  const left = leftOutLines(x);

  return (
    <div className="grid gap-4">
      <Section title="The clinic">
        <div className="grid gap-3 sm:grid-cols-2">
          <KindPicker value={x.kind} onChange={(k) => onChange(toKind(x, k))} />
          <Field id="px-name" label="Clinic name (required)" value={x.instituteName} onChange={(v) => set({ instituteName: v })} placeholder="Not read: type it as the poster spells it" />
          <Field id="px-name-hi" label="Hindi name" lang="hi" value={x.instituteNameHi} onChange={(v) => set({ instituteNameHi: v })} />
          <Field id="px-tagline" label="Tagline" className="sm:col-span-2" value={x.tagline} onChange={(v) => set({ tagline: v })} hint={warn(dentalClaimIssue(x.tagline))} />
          <Field id="px-city" label="City" value={x.city} onChange={(v) => set({ city: v })} />
          <Field id="px-state" label="State" value={x.state} onChange={(v) => set({ state: v })} />
          <Field id="px-locality" label="Area or locality" value={x.locality} onChange={(v) => set({ locality: v })} />
          <Field id="px-established" label="Established" value={x.established} onChange={(v) => set({ established: v })} />
          <Field
            id="px-treatments"
            label="Treatments (one per line)"
            multiline
            value={lines(x.treatments)}
            onChange={(v) => set({ treatments: unlines(v) })}
            hint={flaggedTreatments.length
              ? <>{warn(dentalClaimIssue(flaggedTreatments[0]))} {flaggedTreatments.length > 1 ? `${flaggedTreatments.length} lines are affected.` : `“${flaggedTreatments[0]}”.`}</>
              : "The template’s page for each one is featured first; one with no page is added by name only."}
          />
          <Field id="px-timings" label="Timings and days" multiline value={x.timings} onChange={(v) => set({ timings: v })}
            hint="Replaces the template’s hours everywhere: the contact page, the top of the home page and the open-now line." />
        </div>
      </Section>

      <ContactSection contact={x.contact} onChange={(contact) => set({ contact })} />

      <DoctorsAndFees x={x} set={set} />

      <Section title="Left off the demo">
        <Field
          id="px-offers"
          label="Offers, discounts and camps (one per line)"
          multiline
          value={lines(x.offers)}
          onChange={(v) => set({ offers: unlines(v) })}
          hint="Never printed. The Dental Council code bars offers and inducements on a clinic’s own site. They are kept in the demo’s private notes."
        />
        <div data-testid="dental-left-out" className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
          {left.length ? (
            <>
              <p className="font-medium text-foreground">These lines stay off the demo and go to its private notes:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                {left.map((l, i) => (
                  <li key={i}>“{l.line}”: {CLAIM_REASON[l.issue]}.</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">Nothing on this poster breaks the Dental Council code.</p>
          )}
        </div>
      </Section>

      {x.notes && (
        <p className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">The reader’s note:</strong> {x.notes}
        </p>
      )}
    </div>
  );
}

function DoctorsAndFees({ x, set }: { x: PosterDraft; set: Patch }) {
  return (
    <>
      <Section title="Doctors">
        {!!x.doctors?.length && (
          <p className="text-xs text-muted-foreground">
            The poster’s doctors replace the template’s sample profiles, with no photo: a stock portrait beside a
            real dentist’s name would be read as that dentist. Degrees and the registration number exactly as printed.
          </p>
        )}
        <Rows<PosterDoctor>
          noun="doctor"
          items={x.doctors}
          onChange={(doctors) => set({ doctors })}
          blank={{ name: "" }}
          render={(d, up, i) => (
            <>
              <Field id={`px-d${i}-name`} label="Name" value={d.name} onChange={(v) => up({ name: v })} hint={warn(dentalClaimIssue(d.name))} />
              <Field id={`px-d${i}-degrees`} label="Degrees" value={d.degrees} onChange={(v) => up({ degrees: v })} hint={warn(dentalClaimIssue(d.degrees))} />
              <Field id={`px-d${i}-reg`} label="Registration number" value={d.registration} onChange={(v) => up({ registration: v })} hint={warn(dentalClaimIssue(d.registration))} />
              <Field id={`px-d${i}-spec`} label="Specialisation" value={d.specialisation} onChange={(v) => up({ specialisation: v })} hint={warn(specialisationIssue(d.specialisation))} />
              <Field id={`px-d${i}-exp`} label="Experience" value={d.experience} onChange={(v) => up({ experience: v })} hint={warn(dentalClaimIssue(d.experience))} />
              <Field id={`px-d${i}-days`} label="Days and hours" value={d.days} onChange={(v) => up({ days: v })} hint={warn(dentalClaimIssue(d.days))} />
            </>
          )}
        />
      </Section>

      <Section title="Fees">
        {!!x.fees?.length && (
          <p className="text-xs text-muted-foreground">
            Only fees printed on the poster. They replace the template’s fee table, a matching treatment page gets its
            “from” price, and every other sample price is removed. The site adds the required note that the final cost
            depends on the diagnosis.
          </p>
        )}
        <Rows<PosterFee>
          noun="fee"
          items={x.fees}
          onChange={(fees) => set({ fees })}
          blank={{ treatment: "" }}
          render={(f, up, i) => (
            <>
              <Field id={`px-f${i}-treatment`} label="Treatment" value={f.treatment} onChange={(v) => up({ treatment: v })} />
              <Field id={`px-f${i}-fee`} label="Fee as printed" value={f.fee} onChange={(v) => up({ fee: v })}
                hint={warn(dentalClaimIssue([f.treatment, f.fee, f.unit].filter(Boolean).join(" ")))} />
              <Field id={`px-f${i}-unit`} label="Per" placeholder="per tooth, per visit" value={f.unit} onChange={(v) => up({ unit: v })} />
            </>
          )}
        />
      </Section>
    </>
  );
}
