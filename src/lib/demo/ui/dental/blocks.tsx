/**
 * DENTAL BLOCKS, part one: the reason picker, step lists, the comparison
 * table, the fee table and the payment note. Part two (emergency, reach,
 * cases, kids) is ./blocks2.tsx. STUB LEVEL: working, plain.
 */

import type { DemoPoint, DentalComparison, DentalFeeRow, DentalReason } from "@/lib/cms/types";
import { bi, biList, tr, withText } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { useBooking } from "./booking";
import { DEFAULT_REASONS } from "./BookingFlow";
import { DENTAL_COPY, DISCLAIMER } from "./copy";
import { DentalGlyph } from "./icons";
import { dentalOf, money } from "./logic";
import { Disclaimer } from "./sections";

/** "What do you need help with": 6 to 8 chips; each opens booking at step 2. */
export function ReasonPicker({ reasons, max = 8 }: { reasons?: DentalReason[]; max?: number }) {
  const { site, lang } = useSite();
  const { open } = useBooking();
  const list = (reasons || dentalOf(site).booking?.reasons || DEFAULT_REASONS).slice(0, max);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => open({ reason: r.id, treatment: r.treatment })}
            className="dn-card flex min-h-[88px] w-full flex-col items-start gap-2 p-4 text-left font-semibold" data-interactive="" data-urgent={r.urgent ? "" : undefined}>
            <DentalGlyph name={r.icon} className="h-6 w-6 text-[hsl(var(--ds-accent))]" />
            {bi(r, "label", lang)}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps: journey, first visit, sterilisation, treatment steps. */
export function StepList({ steps, onDark = false }: { steps: DemoPoint[] | undefined; onDark?: boolean }) {
  const { lang } = useSite();
  const list = withText(steps, "title");
  if (!list.length) return null;
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((s, i) => (
        <li key={i}>
          <span className={`text-3xl [font-family:var(--ds-display)] ${onDark ? "text-[hsl(var(--ds-hero-accent))]" : "text-[hsl(var(--ds-accent))]"}`}>{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 font-semibold">{bi(s, "title", lang)}</h3>
          {bi(s, "body", lang) && <p className="mt-1 text-sm opacity-85">{bi(s, "body", lang)}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Braces vs aligners (d5), implant options (d4). Scrolls sideways inside itself on a phone. */
export function ComparisonTable({ data }: { data: DentalComparison | undefined }) {
  const { lang } = useSite();
  if (!data?.columns?.length || !data.rows?.length) return null;
  const cols = lang === "hi" && data.hi?.columns?.length ? data.hi.columns : data.columns;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead><tr><th scope="col" className="p-3" />{cols.map((c, i) => <th key={i} scope="col" className="p-3 font-semibold">{c}</th>)}</tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} className="border-t border-[hsl(var(--ds-line))]">
              <th scope="row" className="p-3 font-medium">{(lang === "hi" && r.hi?.label) || r.label}</th>
              {r.values.map((v, j) => <td key={j} className="p-3">{(lang === "hi" && r.hi?.values?.[j]) || v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Starting from*" rows with dotted leaders; consult rows say so; the fee disclaimer under. */
export function FeeTable({ rows, limit }: { rows?: DentalFeeRow[]; limit?: number }) {
  const { site, lang } = useSite();
  const list = withText(rows || dentalOf(site).fees, "treatment").slice(0, limit);
  if (!list.length) return null;
  return (
    <div>
      <ul className="divide-y divide-[hsl(var(--ds-line))]">
        {list.map((r, i) => (
          <li key={i} className="flex items-baseline gap-3 py-3">
            <span className="font-medium">{bi(r, "treatment", lang)}</span>
            <span aria-hidden="true" className="flex-1 border-b border-dotted border-[hsl(var(--ds-line))]" />
            <span className="text-right font-semibold">
              {r.from && !r.consult ? `${tr(DENTAL_COPY.startingFrom, lang)} ${money(bi(r, "from", lang) || r.from, site.currency)}${r.unit ? ` ${bi(r, "unit", lang)}` : ""}` : tr(DISCLAIMER.consult, lang)}
            </span>
          </li>
        ))}
      </ul>
      <Disclaimer c={DISCLAIMER.fees} className="mt-4" />
    </div>
  );
}

/** EMI line (exact copy when the record has none), payment modes, insurance, consultation fee. */
export function PaymentNote() {
  const { site, lang } = useSite();
  const p = dentalOf(site).payment;
  const modes = biList(p, "modes", lang);
  return (
    <div className="grid gap-2 text-sm">
      <p>{bi(p, "emi", lang) || tr(DISCLAIMER.emi, lang)}</p>
      {bi(p, "emiExample", lang) && <p className="text-[hsl(var(--ds-ink-soft))]">{bi(p, "emiExample", lang)}</p>}
      {modes.length > 0 && <p>{modes.join(" · ")}</p>}
      {bi(p, "insurance", lang) && <p>{bi(p, "insurance", lang)}</p>}
      {bi(p, "consultFee", lang) && <p className="font-medium">{bi(p, "consultFee", lang)}</p>}
    </div>
  );
}
