/**
 * Every demo-site palette, measured, in both themes.
 *
 *   node scripts/check-demo-palettes.mjs
 *
 * A demo site at /demo/<slug> is painted in the INSTITUTE's colours, not
 * Ideovent's, so `.demo-scope` in src/index.css rebuilds the whole shadcn
 * token ladder from two hues. Six presets times two themes is twelve complete
 * palettes, and none of them is ever looked at by a person before it is sent
 * to a director: Mehdi picks a preset from a dropdown and the page goes out.
 *
 * So the check is arithmetic and it runs in the build.
 *
 * IT READS THE REAL CSS. The ladders and the hues are parsed out of
 * src/index.css rather than transcribed here, for the same reason
 * src/lib/pitch/reservedRoutes.ts parses App.tsx: a table somebody has to
 * remember to update is a table that is wrong the first time somebody forgets.
 * Add a preset to the stylesheet and it is measured on the next build. Change
 * a lightness in the ladder and every preset is re-measured against it.
 *
 * WHAT IT ENFORCES
 *   4.5:1  anything that is read as text, including --primary and --secondary
 *          used as a link or a heading colour on each of the three grounds
 *   3:1    --input and --ring, which are control boundaries and a focus
 *          indicator: WCAG 2.1 SC 1.4.11
 *
 * It does NOT check --border, which draws decorative hairlines, and nothing in
 * WCAG asks a decorative rule to meet a ratio.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const cssPath = join(here, '..', 'src', 'index.css')
const css = readFileSync(cssPath, 'utf8')

/* ── Parse the presets ───────────────────────────────────────────────────── */

const presets = {}
for (const m of css.matchAll(/\.demo-palette-([a-z0-9-]+)\s*\{([^}]*)\}/g)) {
  const body = m[2]
  const dh = /--dh:\s*([0-9.]+)/.exec(body)
  const dh2 = /--dh2:\s*([0-9.]+)/.exec(body)
  if (dh && dh2) presets[m[1]] = { dh: Number(dh[1]), dh2: Number(dh2[1]) }
}

/* ── Parse the two ladders ───────────────────────────────────────────────── */

function block(selector) {
  // The selector at the start of a line, then everything to the first closing
  // brace. The ladders contain no nested rules, so this is enough and stays
  // readable; a real CSS parser here would be a dependency for one regex.
  const re = new RegExp(`^${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const m = re.exec(css)
  if (!m) throw new Error(`Could not find the "${selector}" block in src/index.css`)
  return m[1]
}

/** "var(--dh) 40% 8%" -> {h:'dh', s:40, l:8};  "0 0% 100%" -> {h:0, s:0, l:100} */
function parseTriplet(raw) {
  const v = raw.trim().replace(/;$/, '')
  const m = /^(var\(--(dh2?)\)|[0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%$/.exec(v)
  if (!m) return null
  return { h: m[2] || Number(m[1]), s: Number(m[3]), l: Number(m[4]) }
}

function ladder(selector) {
  const out = {}
  for (const m of block(selector).matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    const t = parseTriplet(m[2])
    if (t) out[m[1]] = t
  }
  return out
}

const DARK = ladder('.demo-scope')
const LIGHT = ladder('.light .demo-scope')

/* ── Colour maths ────────────────────────────────────────────────────────── */

function resolve(token, { dh, dh2 }) {
  if (!token) return null
  const h = token.h === 'dh' ? dh : token.h === 'dh2' ? dh2 : token.h
  return [h, token.s, token.l]
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

/* ── The pairs that have to hold ─────────────────────────────────────────── */

const PAIRS = [
  ['foreground', 'background', 4.5],
  ['foreground', 'card', 4.5],
  ['foreground', 'accent', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['muted-foreground', 'card', 4.5],
  ['muted-foreground', 'muted', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['primary', 'background', 4.5],
  ['primary', 'card', 4.5],
  ['primary', 'muted', 4.5],
  ['primary', 'accent', 4.5],
  ['secondary-foreground', 'secondary', 4.5],
  ['secondary', 'background', 4.5],
  ['secondary', 'card', 4.5],
  ['accent-foreground', 'accent', 4.5],
  // Control boundary and focus indicator: SC 1.4.11 asks for 3:1.
  ['input', 'background', 3],
  ['input', 'card', 3],
  ['ring', 'background', 3],
  ['ring', 'card', 3],
]

/* ── Run ─────────────────────────────────────────────────────────────────── */

const names = Object.keys(presets)
if (names.length === 0) {
  console.error('check-demo-palettes: found no .demo-palette-* rules in src/index.css.')
  process.exit(1)
}

let failures = 0
let tightest = { ratio: Infinity }

for (const name of names) {
  const hues = presets[name]
  for (const [theme, tokens] of [
    ['light', LIGHT],
    ['dark', DARK],
  ]) {
    const rows = []
    for (const [fg, bg, min] of PAIRS) {
      const a = resolve(tokens[fg], hues)
      const b = resolve(tokens[bg], hues)
      if (!a || !b) {
        console.error(`check-demo-palettes: ${theme} ladder is missing --${!a ? fg : bg}.`)
        process.exit(1)
      }
      const r = contrast(a, b)
      rows.push({ label: `${fg} on ${bg}`, ratio: r, min })
      // "Tightest" is measured as headroom over the requirement, not as a raw
      // ratio, so a 3.2:1 boundary does not look worse than a 4.6:1 body text.
      if (r / min < tightest.ratio / tightest.min || tightest.ratio === Infinity) {
        tightest = { ratio: r, min, label: `${name} ${theme}: ${fg} on ${bg}` }
      }
    }
    const bad = rows.filter((r) => r.ratio < r.min)
    const worst = rows.reduce((a, b) => (a.ratio / a.min <= b.ratio / b.min ? a : b))
    console.log(
      `  ${name.padEnd(9)} ${theme.padEnd(5)} ${bad.length ? 'FAIL' : 'ok  '} ` +
        `tightest ${worst.ratio.toFixed(2)}:1 (needs ${worst.min}) ${worst.label}`
    )
    for (const r of bad) {
      failures++
      console.error(`     ${r.label}: ${r.ratio.toFixed(2)}:1, needs ${r.min}:1`)
    }
  }
}

if (failures) {
  console.error(`\ncheck-demo-palettes: ${failures} failing pair(s). Fix the ladder in src/index.css.`)
  process.exit(1)
}

console.log(
  `check-demo-palettes: ${names.length} presets x 2 themes x ${PAIRS.length} pairs, all pass. ` +
    `Tightest is ${tightest.ratio.toFixed(2)}:1 against ${tightest.min}:1 (${tightest.label}).`
)
