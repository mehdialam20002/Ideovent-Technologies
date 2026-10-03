import { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, RefreshCw } from "lucide-react";
import { simulate, type SimulateOutcome } from "@/lib/meta/localIntake";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { useNotifications } from "../notifications/Bell";
import { crm } from "../ui";
import { useCrmMe } from "../useCrmMe";

/** A fresh fictional Meta lead id: 9000 and 11 more digits (the test plan's fictional range). */
export function freshLeadId(): string {
  return "9000" + String(Date.now()).slice(-11);
}

interface Form {
  leadId: string;
  platform: "ig" | "fb";
  fullName: string;
  phone: string;
  email: string;
  business: string;
  city: string;
  businessType: string;
  formName: string;
  campaignName: string;
  consent: "yes" | "no" | "none";
}

const START: Omit<Form, "leadId"> = {
  platform: "ig",
  fullName: "Test Lead",
  phone: "+91 90000 00001",
  email: "test@example.org",
  business: "Example Test Classes",
  city: "Patna",
  businessType: "Coaching institute",
  formName: "Website enquiry",
  campaignName: "Test campaign",
  consent: "yes",
};

/** The form as Meta's Graph API gives a lead (snake_case), so it goes through the webhook's own mapping. */
export function fixtureOf(f: Form, now = new Date()) {
  const ad = f.campaignName.trim()
    ? { campaign_id: "9000000000002", campaign_name: f.campaignName, adset_id: "9000000000003", adset_name: "Test ad set", ad_id: "9000000000004", ad_name: "Test ad" }
    : {};
  const answers: [string, string][] = [
    ["full_name", f.fullName], ["phone_number", f.phone], ["email", f.email],
    ["company_name", f.business], ["city", f.city], ["business_type", f.businessType],
  ];
  return {
    id: f.leadId.trim(),
    created_time: now.toISOString(),
    platform: f.platform,
    form_id: "9000000000001",
    form_name: f.formName,
    ...ad,
    is_organic: !f.campaignName.trim(),
    field_data: answers.filter(([, v]) => v.trim()).map(([name, v]) => ({ name, values: [v] })),
    custom_disclaimer_responses: f.consent === "none" ? [] : [{ checkbox_key: "contact_ok", is_checked: f.consent === "yes" }],
  };
}

const FIELDS: { key: keyof Form; label: string; type?: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "business", label: "Business name" },
  { key: "city", label: "City" },
  { key: "businessType", label: "Type of business" },
  { key: "formName", label: "Form" },
  { key: "campaignName", label: "Campaign (empty: organic or a test)" },
];

/**
 * LOCAL MODE ONLY (meta-leads-spec 6.5): "Simulate a Meta lead". Fictional
 * fields, prefilled and editable; the lead goes through the webhook's own
 * mapping and 0012's rules as local mode emulates them (localIntake.ts,
 * LocalCrm.ingestMeta): created, duplicate, already or over the limit. The
 * lead id stays after a run, so pressing again shows "already"; New id makes
 * another. The live CRM never shows this.
 */
export function MetaSimulate({ onDone }: { onDone: () => void }) {
  const { reload } = useOutreach();
  const { refresh } = useNotifications();
  const { nameOf } = useCrmMe();
  const [f, setF] = useState<Form>(() => ({ ...START, leadId: freshLeadId() }));
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<SimulateOutcome | null>(null);
  const set = (k: keyof Form, v: string) => setF((p) => ({ ...p, [k]: v }));
  const idOk = /^\d{1,32}$/.test(f.leadId.trim());

  const run = async () => {
    setBusy(true);
    try {
      const r = await simulate(fixtureOf(f));
      setOut(r);
      if (r.result === "created" || r.result === "duplicate") await Promise.all([reload(), refresh()]);
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const who = out?.assignedTo ? `assigned to ${nameOf(out.assignedTo)}` : "in the Unassigned pool";
  const said =
    !out ? ""
    : out.result === "created" ? `Created, ${who}.`
    : out.result === "duplicate" ? (out.quiet
      ? "Duplicate: the same phone or e-mail is a lead already, touched 3 times today. Logged only."
      : "Duplicate: the same phone or e-mail is a lead already. Its history says someone sent the form with it; the answers wait for you under Waiting on you on Today.")
    : out.result === "already" ? "Already: this Meta lead id came in before. It stays done, even after its lead is deleted."
    : out.result === "over_cap" ? "Over today's limit: it waits. On the live CRM, Meta sends it again and it comes in after midnight."
    : out.message || "Not added.";

  return (
    <section data-testid="meta-simulate" aria-labelledby="meta-sim-h" className={cn(crm.panel, crm.panelPad)}>
      <h2 id="meta-sim-h" className={crm.label}>Simulate a Meta lead</h2>
      <p className="mt-1 text-[12px] text-muted-foreground">Local mode only. Made-up details, as an Instagram or Facebook form would send them.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block text-[12px] font-medium">
          Meta lead id
          <span className="mt-0.5 flex gap-1.5">
            <input id="meta-sim-id" data-testid="meta-sim-id" inputMode="numeric" value={f.leadId} onChange={(e) => set("leadId", e.target.value)}
              aria-invalid={!idOk} className={cn(crm.input, "max-md:h-11", !idOk && "border-destructive")} />
            <button type="button" data-testid="meta-sim-new-id" className={cn(crm.btn, "shrink-0 max-md:h-11")} onClick={() => set("leadId", freshLeadId())}>
              New id
            </button>
          </span>
        </label>
        <label className="block text-[12px] font-medium">
          Platform
          <select data-testid="meta-sim-platform" value={f.platform} onChange={(e) => set("platform", e.target.value)} className={cn(crm.input, "mt-0.5 max-md:h-11")}>
            <option value="ig">Instagram</option>
            <option value="fb">Facebook</option>
          </select>
        </label>
        {FIELDS.map((x) => (
          <label key={x.key} className="block text-[12px] font-medium">
            {x.label}
            <input data-testid={`meta-sim-${x.key}`} type={x.type || "text"} value={f[x.key]} onChange={(e) => set(x.key, e.target.value)}
              className={cn(crm.input, "mt-0.5 max-md:h-11")} />
          </label>
        ))}
        <label className="block text-[12px] font-medium">
          Consent tick
          <select data-testid="meta-sim-consent" value={f.consent} onChange={(e) => set("consent", e.target.value)} className={cn(crm.input, "mt-0.5 max-md:h-11")}>
            <option value="yes">Ticked</option>
            <option value="no">Not ticked</option>
            <option value="none">The form had none</option>
          </select>
        </label>
      </div>
      <button type="button" data-testid="meta-simulate-run" className={cn(crm.btnPrimary, "mt-3 max-md:h-11 max-md:w-full")} disabled={busy || !idOk} onClick={() => void run()}>
        {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
        Simulate a Meta lead
      </button>
      <div aria-live="polite">
        {out && (
          <p data-testid="meta-simulate-result" data-result={out.result}
            className={cn("mt-2 rounded-lg border px-3 py-2 text-[13px]", out.result === "refused" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-muted/40")}>
            {said}
            {out.leadId && out.result !== "refused" && out.result !== "over_cap" && (
              <>
                {" "}
                <Link to={CRM.lead(out.leadId)} className="font-medium text-primary underline-offset-2 hover:underline">Open the lead</Link>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
