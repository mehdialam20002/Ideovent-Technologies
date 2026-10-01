/**
 * Tests "every new demo gets a lead" (src/lib/outreach/demoLead.ts).
 *
 *   node scripts/test-outreach-demo-lead.mjs
 *
 * A demo made from a template or a poster adds a lead (source demo-created,
 * status new, demoId and demoSlug set), or links to the lead the institute
 * already is (same name and city, or same phone or email), never both; the
 * setting "Add every new demo to the CRM" turns it off, and the poster
 * screen's own box overrides the setting both ways.
 *
 * A dental demo (28 Sep 2026) makes a dental lead; linked to an unsorted
 * ("other") lead it makes that lead dental, and a kind someone chose is kept.
 *
 * From the demo to the message (30 Sep 2026): the lead a demo makes is offered
 * the approved first message of its kind, and it names only what that demo
 * has: a d4 demo the implant process and cost information (d4 prices no
 * implant, so never a cost range), a d6 demo the first visit in the approved
 * kids words, a fresh duplicate (no number) one-tap booking and never a call or
 * WhatsApp button, a school demo its own admission session.
 *
 * NEGATIVE CONTROL: DEMO_LEAD_NEGATIVE=1 makes the matcher never match and a
 * dental demo map to "other" again, so the duplicate, dental and
 * demo-to-message checks must FAIL. It exits 0 only when they do.
 */
import { build } from "esbuild";
import { existsSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const NEGATIVE = Boolean(process.env.DEMO_LEAD_NEGATIVE);
const resolveTs = (base) => {
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext) && (ext || /\.[jt]sx?$/.test(base))) return base + ext;
  return base;
};
const alias = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/cms\/client$/ }, () => ({ path: "fake", namespace: "fake" }));
    b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export function supabase() { throw new Error('no'); }", loader: "js" }));
    b.onResolve({ filter: /^@\// }, (a) => ({ path: resolveTs(join(SRC, a.path.slice(2))) }));
    if (NEGATIVE) {
      b.onLoad({ filter: /outreach[\\/]demoLead\.ts$/ }, (a) => {
        const src = readFileSync(a.path, "utf8");
        const sig = "): { lead: OutreachLead; by: \"demo\" | \"name\" | \"contact\" } | null {";
        if (!src.includes(sig)) throw new Error("negative control: matcher signature not found");
        // ...and a dental demo goes back to making an "other" lead.
        const dental = ' || kind === "dental"';
        if (!src.includes(dental)) throw new Error("negative control: dental kind mapping not found");
        return { contents: src.replace(sig, sig + "\n  return null;").replace(dental, ""), loader: "ts" };
      });
    }
  },
};
const out = join(tmpdir(), `ideovent-test-demo-lead-${process.pid}.mjs`);
const bundled = await build({
  stdin: {
    contents: `export * from "@/lib/outreach/demoLead"; export * from "@/lib/outreach/store";
export { render, checkSend, demoFacts } from "@/lib/outreach/engine";
export { templatesFor, suggestedStage } from "@/lib/outreach/templates";`,
    resolveDir: ROOT,
    loader: "ts",
  },
  bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", plugins: [alias],
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) },
});
writeFileSync(out, bundled.outputFiles[0].text);
const M = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

const failures = [];
let passes = 0;
const check = (ok, msg) => (ok ? passes++ : (failures.push(msg), console.log("FAIL  " + msg)));
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) }; };
const demo = (over = {}) => ({ id: "ds_" + Math.random().toString(36).slice(2, 8), slug: "sunrise-public-school", status: "draft", kind: "school", instituteName: "Sunrise Public School", city: "Patna", templateId: "s1-urban-cbse", ...over });

// 1. A new demo with no lead: one lead, source demo-created, status new, linked.
let store = new M.LocalOutreachStore(mem());
const d1 = demo();
const r1 = await M.addDemoToCrm(d1, "template", { store });
const all1 = await store.listLeads();
check(r1 && r1.created && all1.length === 1, "a template demo adds one lead");
check(all1[0].source === "demo-created" && all1[0].status === "new" && all1[0].demoId === d1.id && all1[0].demoSlug === d1.slug && all1[0].kind === "school" && all1[0].city === "Patna", "the lead carries source, status, kind, city, demoId and demoSlug");
check((await store.listEvents(all1[0].id)).some((e) => /Lead created from demo \/site\/sunrise-public-school/.test(e.detail)), "a history note says where the lead came from");
check(!all1[0].phone && !all1[0].email, "no contact invented when the demo carries none");

// 2. Same name and city again: linked, not duplicated.
const d2 = demo({ slug: "sunrise-public-school-2", instituteName: "Sunrise  Public School." });
const r2 = await M.addDemoToCrm(d2, "poster", { store });
const all2 = await store.listLeads();
check(all2.length === 1 && r2 && !r2.created, "same name and city links instead of adding a second lead");
check(all2[0].demoId === d2.id && all2[0].demoSlug === "sunrise-public-school-2", "the existing lead now points at the new demo");

// 3. Same phone, other name: linked by contact.
store = new M.LocalOutreachStore(mem());
await store.upsertLead({ instituteName: "Holy Cross", phone: "98765 43210", city: "Delhi" });
const r3 = await M.addDemoToCrm(demo({ instituteName: "Holy Cross School", city: "Noida", contact: { whatsapp: "919876543210" } }), "poster", { store });
check((await store.listLeads()).length === 1 && r3 && !r3.created, "same WhatsApp number links to the existing lead");

// 4. The poster's contact lands on a new lead.
const r4 = await M.addDemoToCrm(demo({ slug: "vidya-coaching", instituteName: "Vidya Coaching", kind: "coaching", city: "Gaya", contact: { phone: "+91 91234 56789", email: "Info@Vidya.in" } }), "poster", { store });
check(r4 && r4.created && r4.lead.phone === "+919123456789" && r4.lead.email === "info@vidya.in" && r4.lead.kind === "coaching", "a poster's phone and email go on the new lead, normalised");

// 5. The setting and the override.
store = new M.LocalOutreachStore(mem());
await store.saveSettings({ autoAddDemos: false });
check((await M.addDemoToCrm(demo(), "template", { store })) === null && (await store.listLeads()).length === 0, "setting off: no lead");
check((await M.addDemoToCrm(demo(), "poster", { store, force: true })) !== null, "poster box ticked overrides the setting");
store = new M.LocalOutreachStore(mem());
check((await M.addDemoToCrm(demo(), "poster", { store, force: false })) === null && (await store.listLeads()).length === 0, "poster box unticked: no lead even with the setting on");

// 6. Demo kinds to lead kinds: dental is its own kind (28 Sep 2026), anything unknown is "other".
check(M.leadKindForDemo("dental") === "dental" && M.leadKindForDemo("coaching") === "coaching" && M.leadKindForDemo("school") === "school", "demo kinds map to lead kinds, dental included");
check(M.leadKindForDemo("gym") === "other" && M.leadKindForDemo(undefined) === "other", "an unknown demo kind is other");

// 7. A dental demo makes a dental lead.
const dentalDemo = (over = {}) => demo({ slug: "example-dental-clinic", kind: "dental", instituteName: "Example Dental Clinic", city: "Saket", templateId: "d1-family-dentist", ...over });
store = new M.LocalOutreachStore(mem());
const r7 = await M.addDemoToCrm(dentalDemo({ contact: { phone: "+91 98765 43210" } }), "template", { store });
check(r7 && r7.created && r7.lead.kind === "dental" && r7.lead.demoSlug === "example-dental-clinic" && r7.lead.phone === "+919876543210", "a dental demo adds a dental lead with its demo and phone");
const r7b = await M.addDemoToCrm(dentalDemo({ slug: "example-dental-clinic-2" }), "poster", { store });
check(r7b && !r7b.created && (await store.listLeads()).length === 1 && r7b.lead.kind === "dental", "a second demo for the same clinic links, no second lead");

// 8. Linking a dental demo: an unsorted lead ("other") becomes dental; a kind someone chose is kept.
store = new M.LocalOutreachStore(mem());
const unsorted = await store.upsertLead({ instituteName: "Example Dental Clinic", city: "Saket", phone: "98765 43211" });
check(unsorted.kind === "other", "a lead saved without a kind is 'other'");
const r8 = await M.addDemoToCrm(dentalDemo(), "poster", { store });
check(r8 && !r8.created && r8.lead.id === unsorted.id && (await store.getLead(unsorted.id)).kind === "dental", "a dental demo linked to an unsorted lead makes it a dental lead");
check((await store.listEvents(unsorted.id)).some((e) => /kind set to dental/.test(e.detail || "")), "the history says the kind was set");
const chosen = await store.upsertLead({ instituteName: "Example Care Centre", city: "Noida", kind: "school", email: "office@care.example" });
const r8b = await M.addDemoToCrm(dentalDemo({ slug: "example-care", instituteName: "Example Care Centre", city: "Noida" }), "poster", { store });
check(r8b && !r8b.created && (await store.getLead(chosen.id)).kind === "school", "a kind someone chose is never overwritten by a demo's kind");
const relinked = await M.addDemoToCrm(dentalDemo(), "template", { store });
check(relinked && !relinked.created && relinked.lead.kind === "dental", "linking the same dental demo again keeps the lead dental");

// 9. From the demo to the message (30 Sep 2026): the lead a demo makes is offered the approved
//    first message of its kind, and that message names only what the demo has.
{
  const NOW = new Date("2026-09-29T09:00:00.000Z"); // Tuesday 14:30 India time
  const settings = { signature: "", quietStart: "20:00", quietEnd: "10:00", alertOnDemoOpen: false };
  const firstFor = async (d, language = "hinglish", pitch = "new_website") => {
    const st = new M.LocalOutreachStore(mem());
    const { lead } = await M.addDemoToCrm(d, "template", { store: st });
    const t = M.templatesFor({ kind: lead.kind, channel: "whatsapp", stage: "first", pitch, language })[0];
    return { lead, t, r: t && M.render(t, { ...lead, contactName: "Dr. Kapoor", phone: "+91 98765 43210" }, { now: NOW, demo: M.demoFacts(d) }) };
  };
  const implant = await firstFor(dentalDemo({ slug: "example-implant-centre", instituteName: "Example Implant Centre", templateId: "d4-implant-centre" }));
  check(implant.t?.kind === "dental" && implant.r.body.includes("Google par aapka implant centre dekha. Log implant se pehle process aur kharche ki jaankari online dhoondhte hain, par clinic ki website nahi mili.") &&
    implant.r.body.includes("jisme implant ka process, kharche ki jaankari aur appointment booking hai") && !/range/.test(implant.r.body),
    `a d4 demo's lead is offered the approved implant message, and no cost range the demo does not show (${implant.r?.body})`);
  const kids = await firstFor(dentalDemo({ slug: "example-kids", instituteName: "Example Smiles", templateId: "d6-kids-dental" }));
  check(kids.r?.body.includes("Google par aapka kids dental clinic dekha. Parents bachche ki pehli visit se pehle online dekhte hain ki kya hoga, par clinic ki website nahi mili. Humne ek sample page banaya hai jisme pehli visit ki jaankari, timings aur booking hai."),
    `a d6 demo's lead gets the approved kids words (${kids.r?.body})`);
  check(M.suggestedStage(implant.lead.status, "whatsapp", 0) === "first" && !implant.r.warnings.length, "a new demo's lead starts at the first message, and the 'Google par' line raises nothing for a demo-created lead");
  check(M.checkSend({ ...implant.lead, phone: "+91 98765 43210" }, implant.t, "whatsapp", settings, 0, NOW).ok, "the lead has its demo, so 'we made a sample' may be said");

  const fixLead = (d) => ({ instituteName: d.instituteName, kind: "dental", website: "https://example.org", observation: "no_timings", demoSlug: d.slug, contactName: "Dr. Gupta" });
  const fresh = dentalDemo({ slug: "example-fresh", templateId: "d1-family-dentist" });
  const withNumber = dentalDemo({ slug: "example-numbered", templateId: "d1-family-dentist", contact: { phone: "+91 98765 43210", whatsapp: "919876543210" } });
  const fixT = M.templatesFor({ kind: "dental", channel: "whatsapp", stage: "first", pitch: "fix_website", language: "hinglish" })[0];
  const saysFresh = M.render(fixT, fixLead(fresh), { now: NOW, demo: M.demoFacts(fresh) }).body;
  const saysNumbered = M.render(fixT, fixLead(withNumber), { now: NOW, demo: M.demoFacts(withNumber) }).body;
  check(saysFresh.includes("ek tap mein booking") && !/ek tap mein (call|WhatsApp)/.test(saysFresh), "a fresh template duplicate (no number) is never said to have call or WhatsApp buttons");
  check(saysNumbered.includes("ek tap mein call ya WhatsApp"), "with the clinic's number on the demo, the approved 'ek tap mein call ya WhatsApp'");

  const schoolFix = M.templatesFor({ kind: "school", channel: "whatsapp", stage: "first", pitch: "fix_website", language: "en" })[0];
  const schoolLead = { instituteName: "Sunrise Public School", kind: "school", website: "https://example.org", observation: "not_mobile", demoSlug: "sunrise-public-school", contactName: "Principal Ma'am" };
  check(M.render(schoolFix, schoolLead, { now: NOW, demo: M.demoFacts(demo({ sessionLabel: "2027" })) }).body.includes("the 2027 admissions"), "the school message names the session the demo shows");
  check(M.render(schoolFix, schoolLead, { now: NOW }).body.includes("the 2027-28 admissions"), "without the demo at hand, the session is computed from the date");
}

if (NEGATIVE) {
  const expected = [/links instead of adding/, /same WhatsApp number links/, /a dental demo adds a dental lead/, /dental included/, /approved implant message/];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  console.log(`\nNEGATIVE CONTROL: ${failures.length} failures seen.`);
  if (missed.length) { console.log("NEGATIVE CONTROL FAILED: undetected " + missed.join(", ")); process.exit(1); }
  console.log("NEGATIVE CONTROL OK: every sabotage was caught.");
  process.exit(0);
}
console.log(`\ntest-outreach-demo-lead: ${passes} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
