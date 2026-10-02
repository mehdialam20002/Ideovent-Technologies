import { EMAIL_OPT_OUT_HINGLISH, EMAIL_OPT_OUT_HINGLISH_TEAM } from "@/lib/outreach/engine";
import { MEMBER_SWAPS_SHOWN } from "@/lib/outreach/templates";
import { MEMBER_WORDING_KEYS, type MemberWordingKey } from "@/lib/outreach/team";
import { CALL_LINES } from "./callScript";

/**
 * THE TEAM WORDING, AS MEHDI READS IT BEFORE HE APPROVES (Settings > Messages >
 * Team wording; spec 10.7). Built from the very sentences the templates and the
 * call script swap (templates.ts MEMBER_SWAPS, engine.ts's REMOVE line,
 * callScript.ts CALL_LINES), so what he approves is exactly what a member
 * sends. "{place}" stands for the clinic, school or institute.
 */
export interface WordingPair {
  /** His sentence today. */
  owner: string;
  /** What anyone else sends once he approves. */
  member: string;
}

export interface WordingGroup {
  key: MemberWordingKey;
  title: string;
  where: string;
  pairs: WordingPair[];
  /** What changes for members until, and once, he approves it. */
  note?: string;
}

const ABOUT: Record<MemberWordingKey, Omit<WordingGroup, "key" | "pairs">> = {
  we_pitch_note: {
    title: "The note in the pitch-page message",
    where: "First message to a lead with a pitch page, WhatsApp and e-mail",
  },
  we_sample_made: {
    title: "The sample: made by us, or offered by us",
    where: "First messages that offer to make a sample, the day-4 follow-ups, and the e-mail follow-ups that offer one",
    note: "Until you approve this, members send only the messages for a lead whose demo is made, and the day-4 e-mail stays hidden.",
  },
  we_leave_it_here: {
    title: "Leaving it there, and the REMOVE line",
    where: "WhatsApp follow-up and closing e-mail in Hinglish, and the last line of every Hinglish cold e-mail",
    note: "Until you approve this, members are not offered a Hinglish cold e-mail at all (the English ones are true from anyone).",
  },
  we_call_lines: {
    title: "The call script's cold opening and fix",
    where: "Call script. A member's script stops after the fix and hands the lead to you for the price.",
  },
  member_after_yes: {
    title: "After they say yes, without your call times",
    where: "After-yes WhatsApp and e-mail, and the pitch-page note's",
    note: "Then members send the sample link themselves; any call is still a hand-over to you. Until then they hand the lead to you at the yes.",
  },
};

/** The call-script lines (CALL_LINES), with {place} for the place word. */
function callPairs(): WordingPair[] {
  const p = "{place}";
  return [CALL_LINES.madeEn(p), CALL_LINES.offerEn(p), CALL_LINES.offerHi(p), CALL_LINES.showHi(p), CALL_LINES.makeEn(p), CALL_LINES.makeHi(p)]
    .map(([owner, member]) => ({ owner, member }));
}

export const MEMBER_WORDING_GROUPS: readonly WordingGroup[] = MEMBER_WORDING_KEYS.map((key) => ({
  key,
  ...ABOUT[key],
  pairs: [
    ...MEMBER_SWAPS_SHOWN.filter((s) => s.key === key).map(({ owner, member }) => ({ owner, member })),
    ...(key === "we_leave_it_here" ? [{ owner: EMAIL_OPT_OUT_HINGLISH, member: EMAIL_OPT_OUT_HINGLISH_TEAM }] : []),
    ...(key === "we_call_lines" ? callPairs() : []),
  ],
}));
