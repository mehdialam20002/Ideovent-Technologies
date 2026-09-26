import { CheckCircle2, CircleDot } from "lucide-react";
import type { DemoSite } from "@/lib/cms/types";
import { SAMPLE_BLOCKS, SAMPLE_BLOCK_LABEL, isCarried } from "@/lib/demo/site/sample";
import { templateMeta } from "@/lib/demo/templates";

/** The contact fields a duplicate arrives without, in the order the form shows them. */
export const CONTACT_CHECKS: { label: string; empty: (s: DemoSite) => boolean }[] = [
  { label: "Phone", empty: (s) => !(s.contact?.phone || "").trim() },
  { label: "WhatsApp", empty: (s) => !(s.contact?.whatsapp || "").trim() },
  { label: "Email", empty: (s) => !(s.contact?.email || "").trim() },
  { label: "Address", empty: (s) => !(s.contact?.addressLines || []).some((l) => (l || "").trim()) },
  { label: "Map link or map search", empty: (s) => !(s.contact?.mapUrl || "").trim() && !(s.contact?.mapQuery || "").trim() },
  { label: "Their real website", empty: (s) => !(s.officialWebsite || "").trim() },
];

/**
 * THE CHECKLIST ON A DEMO MADE FROM A TEMPLATE.
 *
 * A duplicate carries the whole template under the new name
 * (src/lib/demo/templates/fromTemplate.ts). This panel says what is still
 * the template's, block by block, by comparing each block with the
 * fingerprint it had when it landed (identical to the template's own block,
 * renamed), and which contact fields are still empty. It also holds the one
 * switch that removes the "Sample" lines from the pages.
 */
export function DemoCarriedPanel({ site, onChange }: { site: DemoSite; onChange: (next: DemoSite) => void }) {
  if (!site.templateId) return null;
  const label = templateMeta(site.templateId)?.label || site.templateId;
  const carried = site.sample ? SAMPLE_BLOCKS.filter((b) => isCarried(site, b)) : [];
  const emptyContact = CONTACT_CHECKS.filter((c) => c.empty(site));
  const real = Boolean(site.sample?.real);

  return (
    <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm" data-testid="carried-panel">
      <p className="font-medium">Carried from template {label}: review before you mark it sent</p>
      <p className="mt-1 text-muted-foreground">
        Everything below arrived from the template under this institute’s name. Change what differs
        for them; anything you leave stays as example content.
      </p>

      {carried.length > 0 ? (
        <>
          <p className="mt-3 font-medium">Still identical to the template</p>
          <ul className="mt-1 space-y-1">
            {carried.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                {SAMPLE_BLOCK_LABEL[b]}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          Every carried section has been edited.
        </p>
      )}

      {emptyContact.length > 0 && (
        <>
          <p className="mt-3 font-medium">Contact details, left empty on purpose</p>
          <ul className="mt-1 space-y-1">
            {emptyContact.map((c) => (
              <li key={c.label} className="flex flex-wrap items-center gap-x-2">
                <CircleDot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {c.label}
                <span className="text-xs text-muted-foreground">Add from their own website</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            The pages leave these rows out until you fill them; the enquiry and admissions
            sections still work without them.
          </p>
        </>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={real}
          onChange={(e) =>
            onChange({
              ...site,
              sample: { from: site.sample?.from || site.templateId || "", prints: site.sample?.prints || {}, real: e.target.checked },
            })
          }
        />
        <span>
          <span className="font-medium">Results and reviews on this demo are the institute’s real ones</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Until you tick this or edit those sections, the pages print a small line under them:
            “Sample figures for this demonstration” and “Sample reviews for this demonstration”.
          </span>
        </span>
      </label>
    </div>
  );
}
