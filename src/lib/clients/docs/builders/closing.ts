/**
 * The closing letter (client-process-spec 6.10; new composition, approved once by Mehdi). It closes the
 * project and records where everything stands: what was delivered, the support window and what was
 * reported in it (the same lines as the day-30 e-mail), what they own, our access, their renewals, their
 * records, and how to reach us again. A sentence whose fact was never recorded is left out, never
 * guessed. Blocks on the go-live date and the support dates.
 */
import { inrGroup } from "../../money";
import { fmtDate } from "../../numbering";
import { launchInvoice, supportWindow } from "../../stages";
import type { DocCtx } from "../context";
import type { Block, DocModel } from "../model";
import { ADDRESS_STRIP, legalName, projectName } from "./common";

export function buildClosing(c: DocCtx): DocModel {
  const cl = c.client;
  const p = c.project;
  const s = c.settings;
  const name = projectName(p);
  const win = p ? supportWindow(p) : null;
  const pctx = p ? { client: cl, project: p, docs: c.docs, payments: c.payments, settings: s, today: c.today } : null;
  const inv = pctx ? launchInvoice(pctx) : null;
  const finalPay = inv ? c.payments.filter((x) => x.status === "recorded" && x.againstDoc === inv.id).sort((a, b) => b.receivedOn.localeCompare(a.receivedOn))[0] : null;
  const finalReceipt = finalPay ? c.docs.find((d) => d.kind === "receipt" && d.status === "issued" && d.paymentId === finalPay.id) : null;
  const issues = (p?.issues || []).filter((i) => !win || (i.at.slice(0, 10) >= win.start && i.at.slice(0, 10) <= win.end));
  const open = (p?.issues || []).filter((i) => i.status === "open");
  const goLive = p?.dates.goLive ? fmtDate(p.dates.goLive) : "[go-live date]";
  const delivered = `What was delivered: the work in Statement of Work ${p?.sowRef || "[SOW reference]"} went live on ${goLive}${p?.liveUrl ? ` at ${p.liveUrl}` : ""}.${finalPay ? ` The final payment was received on ${fmtDate(finalPay.receivedOn)}${finalReceipt?.number ? ` (receipt ${finalReceipt.number})` : ""}.` : ""}`;
  const own: string[] = [];
  if (p?.domainName && (p.domainInClientName === "from_start" || p.domainInClientName === "moved_to_them")) own.push(`your domain ${p.domainName} is registered in your name.`);
  if (p?.dates.sourceTransferred) own.push(`The source code and design files were handed over on ${fmtDate(p.dates.sourceTransferred)}.`);
  if (p?.dates.handover) own.push(`Administrator access was transferred as recorded in the handover document of ${fmtDate(p.dates.handover)}.`);
  const renewals = (["domain", "hosting", "ssl", "email"] as const).map((k) => ({ k, r: cl.renewals?.[k] })).filter((x) => x.r?.renewsOn)
    .map(({ k, r }) => [k === "ssl" ? "SSL certificate" : k === "email" ? "Business email" : k === "domain" ? "Domain name" : "Hosting", r!.provider || "______", fmtDate(r!.renewsOn)]);
  const blocks: Block[] = [
    { type: "keyValue", rows: [["Date", "{{issuedOn}}"], ["To", legalName(cl)], ["Attention", cl.contactName || "[contact name]"]] },
    { type: "paragraph", text: `Thank you for working with us on ${name}. This letter closes the project and records where everything stands.` },
    { type: "paragraph", text: delivered },
    { type: "paragraph", text: `The 30-day support window ran from ${win ? fmtDate(win.start) : "[support start date]"} to ${win ? fmtDate(win.end) : "[support end date]"}.` },
    { type: "paragraph", text: "Reported in that time, and what was done:", bold: true },
    issues.length
      ? { type: "bullets", items: issues.map((i) => `${fmtDate(i.at)}: ${i.summary.replace(/[.\s]+$/, "")}. ${(i.done || (i.status === "closed" ? "Fixed" : "Open")).replace(/[.\s]+$/, "")}.`) }
      : { type: "paragraph", text: "Nothing was reported." },
    { type: "paragraph", text: "Left open by agreement:", bold: true },
    open.length
      ? { type: "bullets", items: open.map((i) => `${i.summary.replace(/[.\s]+$/, "")}${i.owedBy ? `, owed by ${i.owedBy}` : ""}${i.by ? `, by ${fmtDate(i.by)}` : ""}.`) }
      : { type: "paragraph", text: "None." },
  ];
  if (own.length) blocks.push({ type: "paragraph", text: `What you own: ${own.join(" ")}` });
  if (p?.dates.accessRemoved) blocks.push({ type: "paragraph", text: `Our access: we removed Ideovent's access to your systems on ${fmtDate(p.dates.accessRemoved)}.` });
  blocks.push({ type: "paragraph", text: "Your renewals:", bold: true });
  if (renewals.length) blocks.push({ type: "table", columns: [{ label: "What", width: 60 }, { label: "Provider", width: 60 }, { label: "Renews on", width: 54 }], rows: renewals });
  blocks.push(
    { type: "paragraph", text: "Keeping these dates is your responsibility unless a separate written arrangement says otherwise." },
    { type: "paragraph", text: "Your records: we keep project records and correspondence for the life of the engagement plus 3 years, then delete or anonymise them. Invoices and receipts are kept for as long as Indian tax law requires. You can ask us to return or delete your confidential information at any time." },
    { type: "paragraph", text: `If you need us again, support is available under a care plan or at Rs. ${inrGroup(s.policy.hourlyRate || 1000)} per hour, agreed in writing before any work starts.` },
    { type: "spacer", mm: 4 },
    { type: "paragraph", text: "Mehdi Alam, Ideovent Technologies" },
    { type: "paragraph", text: ADDRESS_STRIP, muted: true, size: 8.5 },
  );
  return { title: `${name}: closing letter`, fileName: "closing", blocks };
}
