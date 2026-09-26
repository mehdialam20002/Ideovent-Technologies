/*
  SMALL TYPOGRAPHIC CORRECTIONS APPLIED AT RENDER TIME, NOT IN THE DATA.
  ════════════════════════════════════════════════════════════════════════════

  Every string this file touches is a CMS field: `contact.phoneDisplay` and the
  price ranges on the home hero are edited in /admin, and the pitch prices are
  edited per institute. So the fix belongs here rather than in the seed, for two
  reasons.

  The editor is the first one. U+00A0 and U+2060 are invisible in a text input.
  An editor who retypes "+91 77619 21786" gets ordinary spaces back and nobody
  notices until a phone number breaks across two lines in front of a prospect.
  Applying the transform on the way to the DOM means the stored value stays
  plain, greppable and editable, and the rendered value is always correct.

  The second is that these are presentation decisions, and a JSON field that
  silently carries a word joiner is a field that will be copied into an invoice,
  a WhatsApp message or a mailto body, where the character does nothing useful
  and can survive as a mojibake box in the wrong encoding. `nbsp` is never
  applied to an href, a wa.me message body or a tel: link.

  WHAT WAS ACTUALLY BREAKING. Measured in Chrome with Range.getClientRects() on
  every text node on /, /pricing, /contact, /eduflow, /faq and two pitch pages,
  at 375px and 768px, before this file existed:

    768px  /                       "₹40,000-₹85,000" over two lines
    375px  /example-public-school  "₹20,000 to ₹45,000" over two lines, twice
    375px  /example-public-school  "₹1,000 to ₹3,500" over two lines

  The first one is the defect. A hyphen is a break opportunity, so the line
  ended on "₹40,000-" and a visitor scanning for the price of a portal read
  "₹40,000" followed by a dangling hyphen. The other three broke at a space,
  which left both amounts intact but put the connector at the end of the upper
  line ("₹20,000 to" / "₹45,000") rather than with the figure it belongs to.
*/

/** NO-BREAK SPACE. */
const NBSP = " ";

/**
 * WORD JOINER. Zero width, no glyph, and default-ignorable, so a font that does
 * not contain it renders nothing rather than a tofu box. This is what holds a
 * hyphenated range together; U+2011 NON-BREAKING HYPHEN would do the same job in
 * one character but neither Inter nor Sora is guaranteed to carry it, and a
 * missing price glyph is a worse failure than a bad line break.
 */
const WJ = "⁠";

/**
 * Keep a printed value from breaking in the middle of itself.
 *
 * Three rules, in order:
 *
 *   1. A hyphen or en dash between two figures becomes unbreakable.
 *      "₹8,000-₹20,000" now wraps as one unit or not at all.
 *   2. The space before a currency amount becomes a no-break space, so a
 *      connector travels with the figure it introduces: "₹20,000" / "to ₹45,000"
 *      rather than "₹20,000 to" / "₹45,000".
 *   3. A space between two digit groups becomes a no-break space, which is what
 *      holds "+91 77619 21786" together as one telephone number.
 *
 * Everything else is left alone, including the spaces around words, so a long
 * range in a narrow column still has somewhere to break. This is deliberately
 * not `white-space: nowrap`: nowrap on a display-size price in a 343px column
 * does not wrap badly, it overflows the container.
 */
export function unbreakable(value: string): string {
  return value
    .replace(/(?<=\d)\s*[-–]\s*(?=[₹$\d])/g, `${WJ}-${WJ}`)
    .replace(/ (?=[₹$]\d)/g, NBSP)
    .replace(/(?<=\d) (?=\d)/g, NBSP);
}

/**
 * The same transform, safe to call with a value that may be undefined, which is
 * what every optional CMS field is.
 */
export function unbreakableOr(value: string | undefined | null, fallback = ""): string {
  return value ? unbreakable(value) : fallback;
}
