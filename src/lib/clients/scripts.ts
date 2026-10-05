/**
 * The two scripts Mehdi speaks (client-process-spec 4.4, 4.8): the kickoff call (SOP-02 section 4, the
 * opening line and the running order (1) to (9), word for word, with the project's facts filled in, and
 * one line from AMC-SALES-GUIDE section 4 after the money clauses) and the pre-launch care plan
 * conversation (AMC-SALES-GUIDE section 6, moves 1 to 4, word for word, with the prices from pricing.ts
 * CARE). Two lines of the care plan script must be checked before they are said, and the card says so
 * beside them: Move 1's hosting line (true only when the client holds the hosting account, Hosting Terms
 * cl. 4) and the third plan (NEGOTIATION-RULES section 8.3: quote Essential and Growth only for now).
 * A fact not recorded yet is a [blank], as everywhere. Pure: no I/O.
 */
import { CARE_PLANS, inrGroup } from "./money";
import { fmtDate, WEEKDAY_NAMES } from "./numbering";
import type { ProjectCtx } from "./stages";

export interface ScriptLine {
  /** say: words to speak; do: what to do; check: a line to check before saying it; note: why. */
  kind: "say" | "do" | "check" | "note";
  text: string;
}

export interface ScriptStep {
  id: string;
  title: string;
  lines: ScriptLine[];
  /** The Kickoff Checklist Section A line this step ticks (k_A), where there is one. */
  ticks?: string;
}

const has = (v?: string | null) => typeof v === "string" && v.trim().length > 0;
const or = (v: string | null | undefined, blank: string) => (has(v) ? v!.trim() : blank);

/** SOP-02 section 4, the kickoff call. */
export function kickoffScript(c: ProjectCtx): { opening: string; steps: ScriptStep[] } {
  const p = c.project;
  const s = c.settings;
  const weeks = p.durationWeeks ? String(p.durationWeeks) : "[weeks]";
  const restart = inrGroup(s.policy.restartFee || 4000);
  const weekly = p.weeklyUpdateDay ? WEEKDAY_NAMES[p.weeklyUpdateDay] : "[weekly update day]";
  const goLive = p.dates.goLiveTarget ? fmtDate(p.dates.goLiveTarget) : "[go-live date]";
  const devStart = p.dates.devStart ? fmtDate(p.dates.devStart) : "[development start date]";
  return {
    opening: "Main ek checklist saath rakhta hoon har project mein, half hour lagta hai, aur is wajah se baad mein hafton ki delay nahi hoti. Chalein shuru karte hain.",
    steps: [
      { id: "1", title: `(1) Two minutes, what happens over the next ${weeks} weeks.`, lines: [
        { kind: "do", text: "Walk the milestones in SOW section 12: kickoff, content cut-off, design approval, build on staging, go-live, handover. Name the two moments where they have to do something." },
      ] },
      { id: "2", title: "(2) Eight minutes, read the page and feature inventories aloud.", ticks: "inventories", lines: [
        { kind: "do", text: "SOW sections 6 and 7, out loud, page by page." },
        { kind: "note", text: "This is the highest-value eight minutes of the entire project. Things the client assumed were included surface here, for free, instead of in week six." },
      ] },
      { id: "3", title: "(3) Three minutes: the out-of-scope list, pointed at directly.", ticks: "outofscope", lines: [
        { kind: "do", text: "SOW section 5. Say it once, plainly, and then never sound defensive about it again." },
        { kind: "say", text: "Yeh cheezein included nahi hain, ismein koi problem nahi hai, inme se koi bhi baad mein add ho sakti hai change request se. Main abhi bata raha hoon taaki baad mein surprise na ho." },
      ] },
      { id: "4", title: "(4) Four minutes: the three money clauses, read out, not just signed.", ticks: "money", lines: [
        { kind: "note", text: "Said at kickoff these are terms; said in month three they sound like a threat." },
        { kind: "say", text: "Source code and IP transfer only on receipt of the final payment (Clauses 7.1 and 7.2)." },
        { kind: "say", text: "Defect cover runs 30 calendar days from go-live (Clause 10.2). After that, a care plan or the hourly rate." },
        { kind: "say", text: `A project held up by the client for more than 45 continuous days can be invoiced to date and carries a restart fee of Rs. ${restart} (Clause 4.5). And at 15 days late, work moves to another client and the dates shift (Clause 4.4).` },
        { kind: "say", text: "Cover starts the day we go live, so nothing is left unattended between launch and your first month." },
      ] },
      { id: "5", title: "(5) Three minutes, two revision rounds, and what a round is.", lines: [
        { kind: "note", text: "Clause 6.1: exactly 2 rounds per design stage. Clause 6.2: change points sent in separate messages across several days may be counted as separate rounds." },
        { kind: "say", text: "Design ke liye do revision rounds included hain. Round ka matlab hai, ek baar mein poori list. Aap sabki raay ikattha karke ek message mein bhej dijiye. Agar teen din tak alag-alag messages aate rahenge, to woh alag rounds gin liye jaate hain, aur main nahi chahta ki aapka round aise kharch ho." },
      ] },
      { id: "6", title: "(6) Four minutes, people and channel.", lines: [
        { kind: "do", text: `One point of contact: ${or(p.pointOfContact, "[point of contact]")} (Clause 3.7). Confirm this person can actually approve, not just collect opinions.` },
        { kind: "do", text: `Escalation contact: ${or(p.escalationContact, "[escalation contact]")}. Who you contact if the point of contact goes quiet for three working days. Agree it now, while nobody is annoyed.` },
        { kind: "do", text: `One channel: ${or(p.commsChannel, "[channel]")}.` },
        { kind: "say", text: "Approval email pe chahiye hota hai, dono ke liye record rehta hai, aur baad mein kisi ko yaad karne ki zaroorat nahi padti." },
        { kind: "do", text: `Weekly written update every ${weekly}, sent whether or not there is news.` },
        { kind: "do", text: `Your working days and hours: ${or(s.policy.workingHours, "[working hours]")}. Say it now and a Sunday-night message never becomes an expectation.` },
      ] },
      { id: "7", title: "(7) Six minutes, content, and the cut-off date.", lines: [
        { kind: "do", text: "Walk the Content Collection Checklist. Put a name and a date against every row. Then agree the content cut-off date in writing: after it, new content arrives through a change request." },
        { kind: "say", text: "Content cut-off ek date hoti hai jiske baad naya content change request se aata hai. Yeh aapke liye bhi achha hai, iske bina content thoda-thoda aata rehta hai aur project kabhi khatam nahi hota. Kaunsi date realistic hai aapke liye?" },
      ] },
      { id: "8", title: "(8) Four minutes, access and blackout dates.", lines: [
        { kind: "do", text: `Domain registrar login or a named person who will add DNS records the same day. Hosting active and paid past ${goLive}. Client-side blackout dates: exams, audits, holidays, admission season. A week of silence you planned for is not a delay.` },
      ] },
      { id: "9", title: "(9) Two minutes, close.", lines: [
        { kind: "do", text: `Confirm ${devStart} and say what lands in their inbox in the next hour.` },
      ] },
    ],
  };
}

/** AMC-SALES-GUIDE section 6, the four moves, for the pre-launch conversation (or handover day). */
export function careScript(c: ProjectCtx): { steps: ScriptStep[]; plans: { id: string; name: string; monthly: string; yearly: string; quote: boolean }[] } {
  const cl = c.client;
  const domainDate = cl.renewals?.domain?.renewsOn ? fmtDate(cl.renewals.domain.renewsOn) : "[domain renewal date]";
  const clientHeld = cl.custodyModel === "client_held";
  const move1: ScriptLine[] = [
    { kind: "say", text: "Before anything else: the domain is yours, the hosting account is in your name, and here is the credential register. You own all of it, today, whatever you decide next." },
  ];
  if (!clientHeld) {
    move1.unshift({
      kind: "check",
      text: cl.custodyModel === "ideovent_managed"
        ? "Do not say this line: the hosting is on Ideovent's account (Hosting Terms cl. 4.1)."
        : "Check page 1 of the agreement first: \"the hosting account is in your name\" is true only when the client holds the hosting account (Hosting Terms cl. 4). Record the custody model on the client card.",
    });
  }
  move1.push({ kind: "note", text: "Do this first, every time. It removes the suspicion that the plan is a way of keeping control, and it makes everything after it easier to believe." });
  const e = CARE_PLANS.essential;
  const g = CARE_PLANS.growth;
  const pr = CARE_PLANS.priority;
  return {
    steps: [
      { id: "m1", title: "Move 1. Hand over ownership first", lines: move1 },
      { id: "m2", title: "Move 2. Name what happens without a plan", lines: [
        { kind: "say", text: `From today, three things are running on their own: the software updates itself, the domain expires on ${domainDate}, and the site can go down at 2 a.m. without anyone noticing until a parent calls you. None of those are problems right now. They just don't have an owner.` },
        { kind: "note", text: "State it flatly. No drama, no predictions, no statistics." },
      ] },
      { id: "m3", title: "Move 3. Offer the choice, not the question", lines: [
        { kind: "check", text: "NEGOTIATION-RULES section 8.3: quote Essential and Growth only until PRICING-STRATEGY section 3 Step 6 is settled (Priority is below its own cost). Leave the Priority sentence out until then." },
        { kind: "say", text: "So there are three ways people handle it. Essential is backups, security updates and an hour a month of changes. Growth is the same with weekly backups, three hours, a monthly report and a faster reply. Priority is daily backups, six hours, same-day response and a call with me every month. For a site your size that takes online admissions, I'd put you on Growth: the weekly backup and the monthly report are the two that matter for you." },
        { kind: "note", text: `The prices (pricing.ts): Essential Rs ${inrGroup(e.monthly)} a month or Rs ${inrGroup(e.yearly)} a year; Growth Rs ${inrGroup(g.monthly)} or Rs ${inrGroup(g.yearly)}; Priority Rs ${inrGroup(pr.monthly)} or Rs ${inrGroup(pr.yearly)}. Name the two features that fit this client's own site, never "most clients your size".` },
      ] },
      { id: "m4", title: "Move 4. Close by date, not by pressure", lines: [
        { kind: "say", text: "If you want it, cover starts today and the first backup is taken before I log off. If you'd rather not, that's completely fine. I'll send you the handover pack and you're fully independent. Either way you own everything." },
        { kind: "note", text: "The permission to say no is not a softener. It is what makes the yes real." },
      ] },
    ],
    plans: (["essential", "growth", "priority"] as const).map((id) => ({
      id,
      name: CARE_PLANS[id].name,
      monthly: `Rs ${inrGroup(CARE_PLANS[id].monthly)} a month`,
      yearly: `Rs ${inrGroup(CARE_PLANS[id].yearly)} a year`,
      quote: id !== "priority",
    })),
  };
}
