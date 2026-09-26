/**
 * The Ideovent LaunchPad certificate ID scheme: `INT` + year + a 3-character code.
 *
 *   INT2025A73   INT2025A74   INT2025A75 …
 *
 * THE ALPHABET
 * ------------
 * 32 characters, with I, O, 0 and 1 removed on purpose. Those four are the ones
 * people mis-transcribe when they read an ID off a printed certificate and type it
 * into the verification box, and the whole value of the ID is that it still works
 * when the QR code does not.
 *
 * WHY IT AUTO-INCREMENTS
 * ----------------------
 * It used to be three RANDOM characters, retried up to 50 times against the list of
 * IDs already issued. That is fine until the retry loop is looking at an incomplete
 * list: an admin working offline, a Supabase read that came back partial, a second
 * browser open on the same collection, at which point two certificates can be
 * issued with the same ID and the verification page shows one person's record under
 * the other person's certificate. There is no recovering from that quietly: both
 * certificates are already printed and in someone's hands.
 *
 * So the code is now a counter. `nextCertificateId` takes every ID that exists,
 * decodes each 3-character code as a base-32 number in the alphabet above, and
 * returns max + 1. Monotonic, never reused, and the next ID is a pure function of
 * the ones before it, two people looking at the same list get the same answer.
 *
 * The counter deliberately does NOT reset each year. INT2025A74 is followed by
 * INT2026A75, not INT2026AAA. The year says when it was issued; the code says
 * which one it is. Restarting the code every year would mean INT2025A73 and
 * INT2026A73 both exist, which looks like a duplicate to anybody scanning a shelf
 * of certificates and makes a typo in the year silently resolve to a real, wrong
 * certificate.
 *
 * WHY NOTHING IS EVER DELETED
 * ---------------------------
 * The counter is derived from the records that exist. Delete the highest one and
 * the next issue reuses its ID. The admin therefore offers REVOKE and not delete, 
 * which is also the honest behaviour for a credential someone is relying on. See
 * 13-launchpad/CERTIFICATE-SYSTEM.md §5.
 */

/** 32 characters. I, O, 0 and 1 are excluded. They are the ones people mistype. */
export const CERT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BASE = CERT_ALPHABET.length; // 32
export const CERT_CODE_LENGTH = 3;
/** 32³ = 32,768 certificates. At two a year this is not a constraint anyone alive will meet. */
export const CERT_CODE_SPACE = BASE ** CERT_CODE_LENGTH;

const ID_RE = /^INT(\d{4})([A-Z0-9]{3})$/;

/** Decode a 3-character code to its ordinal, or null if it uses a character outside the alphabet. */
export function decodeCertCode(code: string): number | null {
  if (code.length !== CERT_CODE_LENGTH) return null;
  let n = 0;
  for (const ch of code.toUpperCase()) {
    const i = CERT_ALPHABET.indexOf(ch);
    if (i < 0) return null;
    n = n * BASE + i;
  }
  return n;
}

/** Encode an ordinal as a 3-character code. Wraps at the top of the space rather than growing. */
export function encodeCertCode(n: number): string {
  let rest = ((n % CERT_CODE_SPACE) + CERT_CODE_SPACE) % CERT_CODE_SPACE;
  let out = "";
  for (let i = 0; i < CERT_CODE_LENGTH; i++) {
    out = CERT_ALPHABET[rest % BASE] + out;
    rest = Math.floor(rest / BASE);
  }
  return out;
}

/**
 * True when a string is a well-formed certificate ID. Does not say whether it was issued.
 *
 * "Well-formed" means the CODE USES THIS ALPHABET, not merely `[A-Z0-9]{3}`. The looser
 * form said yes to `INT2025AI3`, an ID this module can never generate and `decodeCertCode`
 * can never read. So the one caller that would ever want this (telling a mistyped ID from
 * an unissued one, to offer the I→J / O→P / 0→2 / 1→7 hint) got the wrong answer for
 * exactly the strings the hint exists for. `ID_RE` stays loose on purpose: `nextCertificateId`
 * still has to RECOGNISE a legacy or hand-edited ID well enough to report it in `ignored`.
 */
export function isCertificateId(value: string): boolean {
  const m = ID_RE.exec(value.trim().toUpperCase());
  return m !== null && decodeCertCode(m[2]) !== null;
}

export interface NextIdResult {
  id: string;
  /** The ordinal behind the code, so the admin can show "certificate no. 3". */
  sequence: number;
  /** IDs that could not be decoded and so were ignored when computing the maximum. */
  ignored: string[];
}

/**
 * The next ID to issue.
 *
 * @param existingIds every certificate ID that exists, active AND revoked.
 *                    Leaving revoked ones out would reissue their codes.
 * @param year        the year of ISSUE. Defaults to now. Ankit Kumar's programme
 *                    began in Nov 2024 and his ID reads 2025 because that is when
 *                    it was issued; that convention is deliberate and documented.
 */
export function nextCertificateId(existingIds: readonly string[], year = new Date().getFullYear()): NextIdResult {
  let max = -1;
  const ignored: string[] = [];

  for (const raw of existingIds) {
    const m = ID_RE.exec(String(raw).trim().toUpperCase());
    if (!m) {
      if (String(raw).trim()) ignored.push(String(raw));
      continue;
    }
    const n = decodeCertCode(m[2]);
    if (n === null) {
      ignored.push(String(raw));
      continue;
    }
    if (n > max) max = n;
  }

  // An empty system starts at the first code AFTER the two that already exist in
  // the seed, so a fresh install and the live site agree. With the seed present
  // this branch is unreachable; it exists so the function is total.
  const base = max >= 0 ? max: decodeCertCode("A74") ?? 0;
  let seq = base + 1;

  // Skip anything already taken. With a monotonic counter this loop should never
  // run, but "should never" is how the random generator got here.
  const taken = new Set(existingIds.map((v) => String(v).trim().toUpperCase()));
  let id = `INT${year}${encodeCertCode(seq)}`;
  let guard = 0;
  while (taken.has(id) && guard++ < CERT_CODE_SPACE) {
    seq += 1;
    id = `INT${year}${encodeCertCode(seq)}`;
  }

  return { id, sequence: seq, ignored };
}
