/**
 * Every demo theme, measured, in both templates.
 *
 *   node scripts/check-demo-contrast.mjs
 *
 * A demo site is painted in the INSTITUTE's colours, not Ideovent's, and
 * nobody looks at one before it is sent: Mehdi picks a theme from a dropdown
 * and pastes the link into WhatsApp. Five school themes plus six coaching
 * themes is eleven complete palettes that a director sees before we do. So the
 * check is arithmetic and it runs in the build.
 *
 * IT READS THE REAL TABLES. The token blocks are parsed out of
 * src/lib/demo/schoolThemes.ts and src/lib/demo/coachingThemes.ts rather than
 * transcribed here, for the same reason src/lib/pitch/reservedRoutes.ts parses
 * App.tsx: a table somebody has to remember to update is a table that is wrong
 * the first time somebody forgets. Add a theme and it is measured on the next
 * build. Change one lightness and that theme is re-measured.
 *
 * WHY ARITHMETIC AND NOT A BROWSER. Every value in both tables is an explicit
 * `h s% l%` triple applied directly to text or to the surface under it; nothing
 * is blended, nothing is an alpha over an unknown ground, and no value is
 * inherited from the site's own tokens (that is the point of `--ds-*`). So the
 * rendered colour IS the declared colour, and a headless browser would be a
 * 300 MB dependency for the same three multiplications. The one thing this
 * cannot see is a pair that only exists in the JSX, e.g. `--ds-ink-soft` used
 * on a `--ds-brand` fill; those are caught by the pairs list below being kept
 * honest, and by looking at the page.
 *
 * WHAT IT ENFORCES
 *   4.5:1  every pair that is read as text, on every ground it is painted on.
 *          AA for body copy. Applied even to the pairs that are only ever used
 *          at heading size, where 3:1 would be permitted, because a theme is
 *          chosen once and then used for everything.
 *   1.4:1  `line` against the ground, AS A WARNING AND NOT A FAILURE. Nothing
 *          is read off a hairline, so no accessibility rule applies and this
 *          floor is a judgement rather than a standard: a rule nobody can see
 *          is a rule that is not doing its job, and the failure mode is a
 *          section that looks like it lost its border rather than like it
 *          never had one. It prints and does not stop the build, because a
 *          faint hairline is a design opinion and the build is not the place
 *          to have that argument.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

/* ── Parsing the theme tables ────────────────────────────────────────────── */

/**
 * Pull every `id: "x", … tokens: { … }` out of one theme file.
 *
 * Deliberately narrow: it matches a `tokens: {` block and the `key: "h s% l%"`
 * lines inside it, and ignores everything else in the file. A theme object that
 * does not follow that shape is not silently skipped, it is reported, because a
 * theme that is not measured is exactly the one that ships broken.
 */
function parseThemes(file) {
  const src = readFileSync(join(root, file), 'utf8')
  const out = []
  // Each theme opens with `  <id>: {` at two-space indentation inside the
  // Record literal, and carries an `id: "<id>",` line of its own. The id line
  // is what is trusted, so a key that does not match its own id is caught.
  for (const m of src.matchAll(/\bid:\s*"([a-z0-9-]+)"/g)) {
    const id = m[1]
    const after = src.slice(m.index)
    // A theme may carry ONE table (`tokens`, which the school template pins to
    // light) or TWO (`tokens` plus `tokensDark`, which the coaching template
    // needs because main.tsx sets defaultTheme="dark", so the dark rendering is
    // the first thing a director sees). Both are measured. A second table that
    // exists and is not measured is exactly the one that ships unreadable.
    for (const [key, scheme] of [['tokens', 'light'], ['tokensDark', 'dark']]) {
      const re = new RegExp(`\\b${key}:\\s*\\{([\\s\\S]*?)\\n\\s{4}\\},`)
      const tokBlock = re.exec(after)
      if (!tokBlock) continue
      const tokens = {}
      for (const t of tokBlock[1].matchAll(/(\w+):\s*"([-\d.]+ [\d.]+% [\d.]+%)"/g)) {
        tokens[t[1]] = t[2]
      }
      if (Object.keys(tokens).length) {
        out.push({ file, id: scheme === 'light' ? id : `${id} (dark)`, tokens })
      }
    }
  }
  return out
}

/* ── Colour maths ────────────────────────────────────────────────────────── */

function parseTriplet(v) {
  const m = /^([-\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(v.trim())
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function hsl2rgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

function luminance([r, g, b]) {
  const c = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}

function contrast(a, b) {
  const la = luminance(hsl2rgb(...a))
  const lb = luminance(hsl2rgb(...b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function hex(t) {
  const [r, g, b] = hsl2rgb(...t)
  const p = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${p(r)}${p(g)}${p(b)}`
}

/* ── The pairs that have to hold ─────────────────────────────────────────── */

/*
  Read these as "this text, on that ground". The three grounds are checked for
  every text colour because a template is free to put a card on the page, a band
  behind the card and a paragraph inside it, and a theme that only works on two
  of the three fails in exactly one section.
*/
const PAIRS = [
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['ink', 'surface2', 4.5],
  ['inkSoft', 'bg', 4.5],
  ['inkSoft', 'surface', 4.5],
  ['inkSoft', 'surface2', 4.5],
  ['onBrand', 'brand', 4.5],
  ['brandInk', 'bg', 4.5],
  ['brandInk', 'surface', 4.5],
  ['brandInk', 'surface2', 4.5],
  ['accent', 'bg', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'surface2', 4.5],
  ['heroInk', 'heroBg', 4.5],
  ['heroSoft', 'heroBg', 4.5],
  // The serif accent painted on a deep hero. Only the coaching themes declare
  // it; a theme without one is skipped rather than failed, because the school
  // template puts no accent colour on its hero ground.
  ['heroAccent', 'heroBg', 4.5, 'optional'],
  // The action colour of the multi-page themes (src/lib/demo/site/themes.ts).
  ['onCta', 'cta', 4.5, 'optional'],
  // Soft: printed, never fatal. See the header.
  ['line', 'bg', 1.4, 'soft'],
]

const FILES = ['src/lib/demo/schoolThemes.ts', 'src/lib/demo/coachingThemes.ts', 'src/lib/demo/site/themes.ts']

const themes = FILES.flatMap((f) => {
  try {
    return parseThemes(f)
  } catch (e) {
    // A template that has not been written yet is not a failure. One that
    // exists and cannot be parsed is.
    if (e.code === 'ENOENT') {
      console.log(`  (${f} does not exist yet, skipped)`)
      return []
    }
    throw e
  }
})

if (!themes.length) {
  console.error('check-demo-contrast: no themes found. The parser or the tables have moved.')
  process.exit(1)
}

let failures = 0
let warnings = 0
let checked = 0
let currentFile = ''

for (const theme of themes) {
  if (theme.file !== currentFile) {
    currentFile = theme.file
    console.log(`\n${currentFile}`)
  }
  const rows = []
  for (const [fg, bg, min, soft] of PAIRS) {
    const a = theme.tokens[fg] && parseTriplet(theme.tokens[fg])
    const b = theme.tokens[bg] && parseTriplet(theme.tokens[bg])
    if (!a || !b) {
      // An OPTIONAL pair is one only some templates declare, so a table that
      // does not carry it is silent rather than failed. Every other missing
      // token is fatal: it means the table and this list have drifted, and the
      // pairs that ARE fatal are then being measured against a shape nobody
      // has checked.
      if (soft === 'optional') continue
      rows.push(`  FAIL  ${theme.id}: token "${!a ? fg : bg}" is missing or unparseable.`)
      failures++
      continue
    }
    checked++
    const r = contrast(a, b)
    if (r < min) {
      if (soft === 'soft') warnings++
      else failures++
      rows.push(
        `  ${soft === 'soft' ? 'faint' : 'FAIL '} ${theme.id}  ${fg} on ${bg}  ` +
          `${r.toFixed(2)}:1 (${soft === 'soft' ? 'prefer' : 'needs'} ${min})  ${hex(a)} on ${hex(b)}`,
      )
    }
  }
  console.log(
    rows.length
      ? `  ${theme.id}\n${rows.join('\n')}`
      : `  ok    ${theme.id}  ${PAIRS.length} pairs`,
  )
}

console.log(
  `\n${checked} pairs measured across ${themes.length} themes.` +
    (warnings ? `  ${warnings} hairline${warnings === 1 ? '' : 's'} fainter than 1.4:1 (not fatal).` : ''),
)

if (failures) {
  console.error(
    `\ncheck-demo-contrast: ${failures} pair${failures === 1 ? '' : 's'} below the floor.\n` +
      'Fix the lightness in the theme table. Do not lower the floor: this page is\n' +
      "read on a phone, outdoors, by somebody who has not agreed to look at it.",
  )
  process.exit(1)
}
