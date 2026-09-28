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
 * NEGATIVE CONTROL: DEMO_LEAD_NEGATIVE=1 makes the matcher never match, so
 * the duplicate checks must FAIL. It exits 0 only when they do.
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
        return { contents: src.replace(sig, sig + "\n  return null;"), loader: "ts" };
      });
    }
  },
};
const out = join(tmpdir(), `ideovent-test-demo-lead-${process.pid}.mjs`);
const bundled = await build({
  stdin: { contents: `export * from "@/lib/outreach/demoLead"; export * from "@/lib/outreach/store";`, resolveDir: ROOT, loader: "ts" },
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

// 6. Other kinds map to "other".
check(M.leadKindForDemo("dental") === "other" && M.leadKindForDemo("coaching") === "coaching", "demo kinds map to lead kinds");

if (NEGATIVE) {
  const expected = [/links instead of adding/, /same WhatsApp number links/];
  const missed = expected.filter((re) => !failures.some((f) => re.test(f)));
  console.log(`\nNEGATIVE CONTROL: ${failures.length} failures seen.`);
  if (missed.length) { console.log("NEGATIVE CONTROL FAILED: undetected " + missed.join(", ")); process.exit(1); }
  console.log("NEGATIVE CONTROL OK: every sabotage was caught.");
  process.exit(0);
}
console.log(`\ntest-outreach-demo-lead: ${passes} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
