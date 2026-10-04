/**
 * Measure the side gutter and horizontal overflow on every page, at every
 * breakpoint people actually use.
 *
 *   node scripts/measure-gutters.mjs [baseUrl]
 *
 * Passing means, at every width:
 *   - no horizontal scroll
 *   - nothing sticks out past the viewport except deliberately clipped
 *     decoration (a marquee, a blurred glow) whose ancestor is overflow-hidden
 *   - the left gutter matches the right gutter
 *   - the gutter is at least 16px, so nothing touches the edge of a phone
 *   - every page shares the same gutter at the same width
 */
import { chromium } from 'playwright-core'

const BASE = process.argv[2] || 'http://localhost:5190'

const WIDTHS = [320, 360, 390, 414, 768, 834, 1024, 1280, 1366, 1440, 1600, 1920, 2560]

const ROUTES = [
  '/', '/about', '/services', '/services/ui-ux-design', '/work', '/pricing',
  '/eduflow', '/internship', '/blog', '/faq', '/contact', '/verify', '/privacy',
  // The search landing pages and the blog posts (2 Oct 2026). They are the pages
  // most likely to be a visitor's first page from Google, on a phone. A post is
  // its own layout (article body, tables that scroll inside their own box), so
  // every published one is measured, not just /blog. If a post is unpublished or
  // renamed, change its address here in the same pass.
  '/websites', '/websites/dental-clinic', '/websites/school', '/websites/coaching-institute',
  '/websites/899-per-month',
  '/blog/website-cost-in-india', '/blog/dental-clinic-website-checklist',
  '/blog/school-website-requirements', '/blog/coaching-institute-website-guide',
  '/blog/monthly-website-plan-vs-one-time-payment',
  // The employer-work case page: a different card and band from the client cases.
  '/work/wtf-go',
  // A pitch page. It is not in the sitemap and it is noindex, but it is a real
  // page a real prospect opens on a phone, usually on mobile data, so it is
  // measured with the rest. This is the example record that ships in the seed;
  // if it is ever deleted, point this at another live pitch slug rather than
  // dropping the route.
  '/example-public-school',
  // The India design for a dental clinic (30 September 2026): no website, no
  // observations and a package, so it takes the "could not find a website"
  // hero and the patient-search section that no other seed record reaches.
  '/example-dental-clinic',
  // The international design. Two records, because they exercise different
  // branches of the same page: the first has a recommended package, observed
  // problems and a named owner, and the second has none of those, so it is the
  // one that catches a section collapsing to nothing and taking the gutter with
  // it. Both are seed example records; repoint rather than delete.
  '/example-family-dental',
  '/example-advisory',
  // The remaining two international seed records. They are here because each
  // one takes a branch the first two do not: Manchester is the only record with
  // observed problems and an EMPTY proposedScope, so it catches the "and
  // specifically for" block vanishing, and Sydney is the only international
  // record on the landing-page package, which is the one with the shortest
  // includes list and therefore the shortest price column.
  '/example-legal-partners',
  '/example-strength-co',
  // THE DEMO SITES, measured through the TEN TEMPLATES.
  //
  // A demo is the institute's own website (/site/<slug>), opened on a phone by
  // a director who was sent the link, so it is measured like everything else.
  // This list used to name /site/example-school-demo and
  // /site/example-coaching-demo, two seed records that were removed on
  // 25 September 2026 when the examples became templates in code
  // (src/lib/demo/templates). Those addresses are now the ordinary 404.
  //
  // There is no longer any demo that is always present, which is correct: a
  // seeded demo is a published demo. So the script measures the templates
  // themselves, at /admin/preview/template/<id>. That route renders the SAME
  // DemoSchool / DemoCoaching components the public route renders, FULL WIDTH
  // under one thin admin bar rather than inside the admin sidebar, so the
  // gutter it reports is the gutter a director sees. It is behind the admin
  // login, and the script signs in the way scripts/e2e-demo-lock.mjs does, by
  // setting the local-mode session flag (see SESSION_KEY below). That only
  // works against a LOCAL-MODE dev server; against a Supabase-backed build the
  // routes redirect to the login and are reported as failures, not skipped.
  //
  // All ten, because each wears a different theme and each theme composes its
  // hero differently. A template whose content file is still a stub renders
  // the empty state, which is the state most likely to collapse a section and
  // take the gutter with it, so it is worth measuring as it stands.
  ...[
    's1-urban-cbse', 's2-rural-state-board', 's3-play-school', 's4-residential', 's5-international',
    'c1-jee-neet-urban', 'c2-rural-tuition', 'c3-science', 'c4-foundation', 'c5-government-jobs',
  ].map((id) => `/admin/preview/template/${id}`),
  // The multi-page demos (26 September 2026): the two reference subpages,
  // one per kind. Page builders add their own page here when they build it.
  '/admin/preview/template/s1-urban-cbse/admissions',
  // School subpages, one of each page type, spread over the five families
  // and variants (added by the school verifier, 26 September 2026).
  '/admin/preview/template/s1-urban-cbse/disclosure',
  '/admin/preview/template/s1-urban-cbse/transport',
  '/admin/preview/template/s1-urban-cbse/results',
  '/admin/preview/template/s2-rural-state-board/about',
  '/admin/preview/template/s2-rural-state-board/news',
  '/admin/preview/template/s2-rural-state-board/contact',
  '/admin/preview/template/s3-play-school/programmes',
  '/admin/preview/template/s3-play-school/safety',
  '/admin/preview/template/s3-play-school/parents',
  '/admin/preview/template/s4-residential/boarding',
  '/admin/preview/template/s4-residential/faculty',
  '/admin/preview/template/s4-residential/policies',
  '/admin/preview/template/s5-international/academics',
  '/admin/preview/template/s5-international/student-life',
  '/admin/preview/template/s5-international/facilities',
  '/admin/preview/template/s5-international/results',
  '/admin/preview/template/c1-jee-neet-urban/courses/jee-two-year',
  '/admin/preview/template/c1-jee-neet-urban/results',
  '/admin/preview/template/c1-jee-neet-urban/fees-and-refunds',
  '/admin/preview/template/c2-rural-tuition/courses',
  '/admin/preview/template/c3-science/faculty',
  '/admin/preview/template/c4-foundation/olympiad',
  '/admin/preview/template/c4-foundation/reviews',
  '/admin/preview/template/c5-government-jobs/exam-calendar',
  '/admin/preview/template/c5-government-jobs/cut-offs',
  '/admin/preview/template/c5-government-jobs/demo-class',
  // Dental (28 September 2026): every dental home (seven heroes, three
  // families), then one template's inner pages. d2 carries the widest page
  // set; its treatment and doctor slugs are fixed in DENTAL-ARCHITECTURE.md.
  ...[
    'd1-family-dentist', 'd2-multispeciality', 'd3-smile-studio', 'd4-implant-centre',
    'd5-ortho-aligners', 'd6-kids-dental', 'd7-dental-chain',
  ].map((id) => `/admin/preview/template/${id}`),
  ...[
    'treatments', 'treatments/root-canal-treatment', 'doctors', 'doctors/meera-reddy', 'before-after',
    'book', 'reviews', 'fees', 'technology', 'kids', 'emergency', 'blog', 'faq', 'contact', 'about',
    'privacy',
  ].map((p) => `/admin/preview/template/d2-multispeciality/${p}`),
  '/admin/preview/template/d7-dental-chain/clinics',
  '/admin/preview/template/d1-family-dentist/blog',
  // The Templates tab itself: an admin page with no .container-page, so only
  // the horizontal-scroll and overflow checks apply. Its card grid is the
  // thing most likely to push a phone sideways.
  '/admin/templates',
  // THE CRM's team screens (crm-team-spec 13.4) and Meta Lead Ads
  // (meta-leads-spec M3), local mode, behind the same session flag. No
  // .container-page either: the scroll and overflow checks apply. Team is
  // Mehdi's; My day is a member's own first screen, so that route carries
  // ?gutters-as=member and the init script below acts as a fictional member.
  '/crm/team',
  '/crm/settings/meta',
  '/crm?gutters-as=member',
]

/** Routes behind the admin login. Mirrors src/admin/auth.tsx, local mode. */
const SESSION_KEY = 'ideovent_admin_session'
const needsLogin = (route) => route.startsWith('/admin') || route.startsWith('/crm')
/** What a route renders once its lazy chunk has arrived (null: measure once the DOM is there). */
const readySelector = (route) =>
  route.startsWith('/admin/preview/template/') ? '.demo-school, .demo-coaching, .ds-site'
    : route === '/crm/team' ? '[data-testid="crm-team"]'
    : route === '/crm/settings/meta' ? '[data-testid="meta-leads-page"]'
    : route.startsWith('/crm?gutters-as=member') ? '[data-testid="my-day"]'
    : null

/**
 * The CRM in local mode reads its team from localStorage. A fictional team
 * (Mehdi and one member with two leads) is written once per fresh profile, and
 * "Act as" is set only on the route that asks for the member, so every other
 * CRM route is Mehdi's.
 */
const CRM_SEED = (() => {
  const at = '2026-10-01T05:00:00.000Z'
  const person = (id, displayName, role) => ({
    id, userId: `local:${id}`, email: `${id.slice(2)}@gutters.example`, displayName, role, viewAll: role !== 'member',
    canAddLeads: role !== 'member', waDailyLimit: role === 'member' ? 25 : null, newLeadCap: role === 'member' ? 10 : 1000,
    mayColdCall: role !== 'member', targets: {}, senderName: displayName, active: true, mustChangePassword: false, createdAt: at,
  })
  const lead = (id, instituteName, status) => ({
    id, instituteName, kind: 'school', city: 'Patna', phone: `+91981000${id.slice(-4)}`, source: 'CSV import', status,
    createdAt: at, updatedAt: at, createdById: 'm_owner', assigneeId: 'm_gutter', assignedAt: at, assignedById: 'm_owner',
  })
  return {
    leads: [lead('ol_gut_0001', 'Example Gutter Public School', 'new'), lead('ol_gut_0002', 'Example Gutter Classes With A Long Name', 'contacted')],
    events: [], settings: null,
    team: {
      members: [person('m_owner', 'Mehdi Alam', 'owner'), person('m_gutter', 'Gutter Example', 'member')],
      notifications: [], requests: [], audit: [], bookings: [], rules: [], reviews: [], usage: {}, seq: 10,
    },
  }
})()

const MIN_GUTTER = 16

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)
  return candidates
}

const measure = () => {
  const vw = document.documentElement.clientWidth
  const de = document.documentElement

  // Decoration that is meant to bleed: it is clipped by an overflow-hidden
  // ancestor, so it never reaches the user as a scrollbar.
  // auto and scroll count too: a wide table inside overflow-x-auto is the
  // correct pattern, not a defect. Only an unclipped bleed reaches the user
  // as a page-level scrollbar.
  const isClipped = (el) => {
    let p = el.parentElement
    while (p && p !== document.body) {
      const o = getComputedStyle(p)
      if (['hidden', 'auto', 'scroll', 'clip'].includes(o.overflowX) ||
          ['hidden', 'auto', 'scroll', 'clip'].includes(o.overflow)) return true
      p = p.parentElement
    }
    return false
  }

  const bleeding = []
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return
    if (getComputedStyle(el).position === 'fixed') return
    if (r.right > vw + 1 || r.left < -1) {
      if (isClipped(el)) return
      bleeding.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
      })
    }
  })

  // The gutter is what a reader sees: where the first real content sits.
  const containers = [...document.querySelectorAll('.container-page')]
    .filter((e) => e.getBoundingClientRect().height > 4)
  const gutters = containers.map((e) => {
    const r = e.getBoundingClientRect()
    const cs = getComputedStyle(e)
    return {
      left: Math.round(r.left + parseFloat(cs.paddingLeft)),
      right: Math.round(vw - (r.right - parseFloat(cs.paddingRight))),
    }
  })

  const lefts = [...new Set(gutters.map((g) => g.left))]
  const rights = [...new Set(gutters.map((g) => g.right))]

  return {
    vw,
    scrollWidth: de.scrollWidth,
    hScroll: de.scrollWidth > vw + 1,
    bleeding: bleeding.slice(0, 4),
    bleedCount: bleeding.length,
    gutterLeft: lefts,
    gutterRight: rights,
    containers: containers.length,
  }
}

const browser = await (async () => {
  for (const p of findChrome()) {
    try {
      return await chromium.launch({ executablePath: p, headless: true })
    } catch {}
  }
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (e) {
    console.error('Could not launch a browser. Set CHROME_PATH.')
    throw e
  }
})()

/*
  A FRESH TAB PER ROUTE. Until 26 Sep 2026 one tab loaded every route at every
  width, a few hundred navigations. Once the demo templates gained their HD
  photos, that single tab's renderer ran out of memory about 17 routes in and
  Chrome closed it ("Target page, context or browser has been closed"), which
  failed the gate on a route that was fine. Nobody browses 300 pages in one
  tab, so each route now gets its own, and a crashed tab is reopened and the
  width retried once. The admin session flag goes in through an init script so
  every new tab carries it (sessionStorage belongs to the tab).
*/
const context = await browser.newContext()
if (ROUTES.some(needsLogin)) {
  await context.addInitScript((key) => {
    try { sessionStorage.setItem(key, '1') } catch {}
  }, SESSION_KEY)
}
if (ROUTES.some((r) => r.startsWith('/crm'))) {
  await context.addInitScript(([seed]) => {
    try {
      if (!location.pathname.startsWith('/crm')) return
      if (!localStorage.getItem('ideovent_outreach_v1')) localStorage.setItem('ideovent_outreach_v1', JSON.stringify(seed))
      if (new URLSearchParams(location.search).get('gutters-as') === 'member') localStorage.setItem('ideovent_crm_local_actor', 'm_gutter')
      else localStorage.removeItem('ideovent_crm_local_actor')
    } catch {}
  }, [CRM_SEED])
}
let page = await context.newPage()
const freshPage = async () => {
  await page.close().catch(() => {})
  page = await context.newPage()
}
const crashed = (e) => /closed|crash/i.test(String(e && e.message))

const failures = []
const perWidth = new Map()

for (const route of ROUTES) {
  let ok = true
  const notes = []
  await freshPage()
  for (const w of WIDTHS) {
    let loaded = false
    for (let attempt = 0; attempt < 2 && !loaded; attempt++) {
      try {
        await page.setViewportSize({ width: w, height: 900 })
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 })
        loaded = true
      } catch (e) {
        if (!crashed(e)) break
        await freshPage()
      }
    }
    if (!loaded) {
      notes.push(`${w}: did not load`)
      ok = false
      continue
    }
    if (needsLogin(route) && new URL(page.url()).pathname.startsWith('/admin/login')) {
      notes.push(`${w}: redirected to the admin login, so nothing was measured (is this a Supabase-mode server?)`)
      ok = false
      continue
    }
    const ready = readySelector(route)
    if (ready) {
      // One reload before giving up: a dev server that is re-optimising
      // dependencies can stall a lazy chunk once. A template that is actually
      // broken fails both times.
      let rendered = false
      for (let attempt = 0; attempt < 2 && !rendered; attempt++) {
        if (attempt) {
          // The reload can fail for a reason outside the app (on 4 Oct 2026 Windows suspended the network for a
          // moment: net::ERR_NETWORK_IO_SUSPENDED, and the whole run crashed after 76 routes). Then the route is
          // opened again on a fresh page; only if that fails too is the route marked as not rendered.
          const reloaded = await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).then(() => true, () => false)
          if (!reloaded) {
            await freshPage()
            await page.setViewportSize({ width: w, height: 900 }).catch(() => {})
            const again = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 }).then(() => true, () => false)
            if (!again) break
          }
        }
        rendered = await page.waitForSelector(ready, { timeout: 15000 }).then(() => true, () => false)
      }
      if (!rendered) {
        notes.push(`${w}: the template never rendered`)
        ok = false
        continue
      }
    }
    await page.waitForTimeout(140)
    const m = await page.evaluate(measure)

    if (m.hScroll) { notes.push(`${w}: horizontal scroll (${m.scrollWidth} > ${m.vw})`); ok = false }
    if (m.bleedCount) {
      notes.push(`${w}: ${m.bleedCount} unclipped overflow, first ${m.bleeding[0]?.tag}.${m.bleeding[0]?.cls}`)
      ok = false
    }
    if (m.gutterLeft.length > 1 || m.gutterRight.length > 1) {
      notes.push(`${w}: gutters disagree L=${m.gutterLeft} R=${m.gutterRight}`); ok = false
    }
    const L = m.gutterLeft[0], R = m.gutterRight[0]
    if (L !== undefined && Math.abs(L - R) > 1) { notes.push(`${w}: asymmetric L=${L} R=${R}`); ok = false }
    if (L !== undefined && L < MIN_GUTTER) { notes.push(`${w}: gutter ${L}px below ${MIN_GUTTER}px`); ok = false }

    if (L !== undefined) {
      const seen = perWidth.get(w) || new Map()
      seen.set(L, [...(seen.get(L) || []), route])
      perWidth.set(w, seen)
    }
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${route}`)
  notes.slice(0, 4).forEach((n) => console.log('        ' + n))
  if (!ok) failures.push(route)
}

console.log('\ngutter by width (px), and whether every page agrees:')
for (const w of WIDTHS) {
  const seen = perWidth.get(w)
  if (!seen) continue
  const vals = [...seen.keys()]
  const agree = vals.length === 1
  console.log(`  ${String(w).padStart(4)}  ${String(vals.join(' / ')).padStart(7)}  ${agree ? 'all pages agree' : 'MISMATCH: ' + [...seen.entries()].map(([v, rs]) => `${v}px on ${rs.join(',')}`).join(' | ')}`)
}

await browser.close()
console.log(failures.length ? `\nFAILED on ${failures.length} route(s)` : '\nall routes pass at every width')
process.exit(failures.length ? 1 : 0)
