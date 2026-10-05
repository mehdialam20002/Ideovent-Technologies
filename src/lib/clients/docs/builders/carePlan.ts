/**
 * Care plan options (client-process-spec 6.8): one page, "After the support window: care plan options",
 * the Project-Handover-Document section 10 table word for word with the fee rows from pricing.ts CARE,
 * its four bullets word for word, and the contact strip. It is section 10 of the handover document and
 * also its own PDF for the day-25 message. Blocks on nothing.
 */
import { CARE_PLANS, inrGroup } from "../../money";
import type { DocCtx } from "../context";
import type { Block, DocModel } from "../model";
import { ADDRESS_STRIP, GST_LINE } from "./common";

/** Section 10 of the handover document: the table and its bullets. */
export function carePlanBlocks(): Block[] {
  const e = CARE_PLANS.essential;
  const g = CARE_PLANS.growth;
  const pr = CARE_PLANS.priority;
  return [
    { type: "table", columns: [{ label: "", width: 70 }, { label: "Essential", width: 34 }, { label: "Growth", width: 34 }, { label: "Priority", width: 36 }], rows: [
      ["Off-site backup of files and database", "Monthly", "Weekly", "Daily"],
      ["Security and framework updates, tested before release", "Yes", "Yes", "Yes"],
      ["Uptime monitoring and renewal reminders", "Yes", "Yes", "Yes"],
      ["Included content-change hours per month", "1 hour", "3 hours", "6 hours"],
      ["First-response target", "48 working hours", "24 working hours", "Same working day"],
      ["Monthly report", "No", "Yes", "Yes"],
      ["Staging site and monthly strategy call", "No", "No", "Yes"],
      ["Fee per month", `Rs. ${inrGroup(e.monthly)}`, `Rs. ${inrGroup(g.monthly)}`, `Rs. ${inrGroup(pr.monthly)}`],
      ["Fee per year, paid in advance", `Rs. ${inrGroup(e.yearly)}`, `Rs. ${inrGroup(g.yearly)}`, `Rs. ${inrGroup(pr.yearly)}`],
    ] },
    { type: "bullets", items: [
      "This is a summary. The full terms are in the Maintenance and Support Agreement, which is the document that governs if the two ever differ.",
      "No care plan is compulsory, and nothing switches on by default. If none is taken, the site keeps working. But nobody is watching it, nothing is being backed up by Ideovent, and updates stop.",
      "A plan started within thirty days of this handover continues straight on from the support window, with no gap and no re-audit. Starting one later may need a paid audit first, because Ideovent will not take responsibility for a site it has not seen for months.",
      GST_LINE,
    ] },
  ];
}

export function buildCarePlan(c: DocCtx): DocModel {
  return {
    title: "After the support window: care plan options",
    subtitle: c.project?.name ? `${c.project.name}, ${c.client.orgName}` : c.client.orgName,
    fileName: "care-plan",
    blocks: [...carePlanBlocks(), { type: "spacer", mm: 4 }, { type: "paragraph", text: `Ideovent Technologies · ${ADDRESS_STRIP}`, muted: true, size: 8.5 }],
  };
}
