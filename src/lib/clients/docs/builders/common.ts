/**
 * What every builder prints the same way (client-process-spec 6.1 "Fixed facts").
 *
 * Fixed facts are printed, never typed per client: the firm, the address strip,
 * the GST line, "Authorised Partner". From Settings, only what a document
 * prints, as the templates print it: a missing value is a [blank], so the
 * document cannot be issued until it is filled (6.1's table). The Udyam number
 * (quotation, proforma and invoice only) is one of them: FACTS prints it on
 * invoices and agreements "not on the website", and the CRM's code is served
 * from the website's own deployment, so the number lives in Settings > Client
 * process (Mehdi's row of 0014), never in this file.
 */
import { amountInWords, moneyFmt } from "../../money";
import { fmtDate } from "../../numbering";
import type { ClientSettings, CrmClient, CrmProject } from "../../types";
import type { Block } from "../model";

export const FIRM = "Ideovent Technologies";
export const ADDRESS_STRIP = "Saket, New Delhi, India · +91 77619 21786 · www.ideovent.in · contact@ideovent.in";
export const GST_LINE = "GST not applicable. Supplier is not registered under GST.";
export const TEMPLATE_NOTE = "Template for Ideovent Technologies. Have a qualified advocate or chartered accountant review this before first use. Not a substitute for professional legal advice.";
export const AUTHORISED = "Authorised Partner";

export const m = moneyFmt;
export const inrAmount = (n: number) => `INR ${moneyFmt(n)}`;
export const rs = (n: number) => `Rs. ${moneyFmt(n).replace(/\.00$/, "")}`;
export const words = (n: number) => amountInWords(n);
export const d = (iso?: string | null, blank = "[date]") => (iso ? fmtDate(iso) : blank);

const has = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export const firmPan = (s: ClientSettings) => (has(s.billing.firmPan) ? s.billing.firmPan.trim() : "[firm PAN]");
/** The firm's Udyam registration number, from Settings (see the note at the top): a [blank] until it is typed there. */
export const udyamNo = (s: ClientSettings) => (has(s.billing.udyam) ? s.billing.udyam.trim() : "[Udyam number]");
export const signatory = (s: ClientSettings) => (has(s.billing.signatory) ? s.billing.signatory.trim() : "[authorised signatory]");
export const legalName = (c: CrmClient) => (has(c.legalName) ? c.legalName.trim() : c.legalSameAsTrading && has(c.orgName) ? c.orgName.trim() : "[legal name]");
export const projectName = (p: CrmProject | null) => (p && has(p.name) ? p.name.trim() : "[project name]");

/** "Bill to": the legal name and billing address; the client's GSTIN under it when one is recorded (E13 c). */
export function billTo(c: CrmClient): string {
  const addr = has(c.billingAddress) ? c.billingAddress.trim().replace(/\s*\n\s*/g, ", ") : "[billing address]";
  return `${legalName(c)}, ${addr}${has(c.gstin) ? `\nGSTIN ${c.gstin.trim()}` : ""}`;
}

/** The firm's tax rows. Udyam is printed on the quotation, proforma and invoice only. */
export function taxRows(s: ClientSettings, udyam: boolean): [string, string][] {
  return [["PAN of the firm", firmPan(s)], ["GSTIN", "Not registered"], ...(udyam ? ([["Udyam / MSME", udyamNo(s)]] as [string, string][]) : [])];
}

/** "How to pay" (Proforma and Invoice section 2/3): the firm's current account. */
export function bankRows(s: ClientSettings, reference: string): [string, string][] {
  const b = s.billing;
  const rows: [string, string][] = [
    ["Bank name", has(b.bankName) ? b.bankName : "[bank name]"],
    ["Account name", `${has(b.accountName) ? b.accountName : "[account name]"}  (the firm's current account, must match the name the bank prints)`],
    ["Account number", has(b.accountNo) ? b.accountNo : "[account number]"],
    ["Account type", "Current account in the name of the firm, operated under the signing mandate agreed between the partners"],
    ["IFSC", has(b.ifsc) ? b.ifsc : "[IFSC]"],
  ];
  if (!b.branchNotPrinted) rows.push(["Branch", has(b.branch) ? b.branch : "[branch]"]);
  if (!b.noUpi) rows.push(["UPI ID", has(b.upiId) ? b.upiId : "[UPI ID]"]);
  rows.push(["Payment reference", reference]);
  return rows;
}

export const policyDays = (v: number | undefined, label: string) => (typeof v === "number" && v > 0 ? String(v) : `[${label}]`);

/** The money columns of the line tables. */
export const LINE_COLUMNS = [
  { label: "#", width: 8 },
  { label: "Description of services delivered", width: 76 },
  { label: "Qty", width: 14, align: "right" as const },
  { label: "Unit", width: 16 },
  { label: "Rate (INR)", width: 30, align: "right" as const },
  { label: "Amount (INR)", width: 30, align: "right" as const },
];

/**
 * The line table with its description column named for what the document is (E13 h): "services delivered" is
 * true of an invoice after the work; a quotation and a proforma come before it ("Description of services"), and a
 * credit note's lines are what is credited ("Description").
 */
export const lineColumns = (description: string) => LINE_COLUMNS.map((c, i) => (i === 1 ? { ...c, label: description } : c));

export const TOTAL_COLUMNS = [{ label: "", width: 134 }, { label: "Amount (INR)", width: 40, align: "right" as const }];

export function lineRows(lines: { description: string; qty?: number; unit?: string; rate?: number; amount: number }[]): string[][] {
  if (!lines.length) return [["1", "[scope line]", "", "", "", ""]];
  return lines.map((l, i) => [String(i + 1), l.description.trim() || "[scope line]", l.qty !== undefined ? String(l.qty) : "", l.unit || "", l.rate !== undefined ? m(l.rate) : "", m(l.amount)]);
}

export const gstCallout = (): Block => ({ type: "callout", lines: [GST_LINE] });

/** The client's short name for file names: "ExampleSchool". */
export function shortName(c: CrmClient): string {
  return (c.orgName || "Client").normalize("NFKD").replace(/[^A-Za-z0-9 ]+/g, "").split(/\s+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join("").slice(0, 40) || "Client";
}
