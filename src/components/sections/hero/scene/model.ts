/**
 * The home hero's 3D scene, "Plan to Page": EVERY NUMBER lives here.
 *
 * A small business's mobile page is drawn as a plan, then its parts rise out of
 * their own outlines in reading order, and a gold pin cut from the chevron of the
 * i lands on its map. The worker (render.ts), the poster generator (poster.ts,
 * scripts/build-hero-poster.mjs) and the tests read only this file, so the canvas
 * and the drawn stills come from the same numbers. Pure data: NO three import.
 *
 * Spec: _build/specs/hero-3d-spec.md (sections 3, 4, 5, 8). After changing a
 * number, run `npm run hero:posters` (the build fails on stale posters).
 */

/** One-line kill switch: false ships the drawn still to everyone, and no worker starts. */
export const HERO_3D_ENABLED = true;

/** 1 world unit = 100 page px. */
export const PX = 0.01;
/** A 390 x 716 page-px mobile page lying flat in XZ (x right, header far -Z, map near +Z, Y up). No slab: t = 0. */
export const PAGE = { w: 390, d: 716, t: 0 } as const;
/** Multiplies every part height. Tunable 1.0 to 1.35 ("more 3D"); try 1.3 first if it reads flat. */
export const RELIEF = 1.0;
/** Walls lean in at the outer edge of the V blade in 01-brand/logo/ideovent-mark.svg: atan(57.05 / 143.8) = 21.6 deg. */
export const V_BLADE = Math.atan(57.05 / 143.8);
/** Top inset per unit of height (0.397). */
export const TAPER = Math.tan(V_BLADE);

export type Role = "slab" | "chip" | "chip2" | "photo" | "ink" | "muted" | "button" | "row" | "row2" | "map" | "road";
export interface Piece {
  id: string;
  role: Role;
  /** Top-left corner of the footprint, page px. */
  x: number;
  y: number;
  /** Width, and depth down the page, page px. */
  w: number;
  d: number;
  /** Height at rest, page px (RELIEF applied). */
  h: number;
  /** The part it stands on, or null for the page. */
  on: string | null;
  /** Build step, 0 to 13: the page builds the way it is read. */
  step: number;
}

type Row = [string, Role, number, number, number, number, number, string | null, number];
const ROWS: Row[] = [
  ["header", "slab", 16, 16, 358, 44, 7, null, 0],
  ["logo", "chip", 28, 26, 24, 24, 8, "header", 1],
  ["menu", "chip2", 330, 32, 32, 12, 6, "header", 1],
  ["photo", "photo", 16, 72, 358, 176, 14, null, 2],
  ["title1", "ink", 16, 266, 300, 22, 14, null, 3],
  ["title2", "ink", 16, 296, 214, 22, 14, null, 4],
  ["body1", "muted", 16, 334, 336, 10, 6, null, 5],
  ["body2", "muted", 16, 352, 310, 10, 6, null, 6],
  ["body3", "muted", 16, 370, 236, 10, 6, null, 7],
  ["call", "button", 16, 398, 358, 48, 18, null, 8],
  ["h1l", "row", 16, 470, 150, 12, 6, null, 9],
  ["h1r", "row2", 284, 470, 90, 12, 6, null, 9],
  ["h2l", "row", 16, 492, 150, 12, 6, null, 10],
  ["h2r", "row2", 284, 492, 90, 12, 6, null, 10],
  ["h3l", "row", 16, 514, 150, 12, 6, null, 11],
  ["h3r", "row2", 284, 514, 90, 12, 6, null, 11],
  ["map", "map", 16, 548, 358, 150, 8, null, 12],
  ["roadA", "road", 20, 617, 350, 10, 3, "map", 13],
  ["roadB", "road", 116, 552, 10, 142, 3.6, "map", 13],
];
/** The 19 tapered blocks (spec 3.3). A stacked part's base follows its support's current top every frame. */
export const PIECES: readonly Piece[] = /*#__PURE__*/ ROWS.map(([id, role, x, y, w, d, h, on, step]) => ({ id, role, x, y, w, d, h: h * RELIEF, on, step }));
export const STEPS = 14;

/** The notched chevron of the i in ideovent-mark.svg (M79.4 34.8 99.5 42.9 119.6 34.8 99.5 85.7Z), tip last. */
export const CHEVRON: readonly (readonly [number, number])[] = [
  [79.4, 34.8],
  [99.5, 42.9],
  [119.6, 34.8],
  [99.5, 85.7],
];
/**
 * The pin: the ONLY gold element. A form derived from the mark, not the logo: no V
 * strokes, no stem, never spun, rolled, bevelled or glowing. Stands tip down at page
 * (x, y) on top of the map, h page px tall, t page px deep, turned `turn` degrees from
 * the camera's azimuth toward the key light (desk -24 deg, phone -18 deg).
 *
 * shape: "chevron" needs Mehdi's one-line OK (the i's chevron used alone on the map,
 * never next to the logo). If no: set "teardrop" (a plain map pin, still the only
 * gold), run `npm run hero:posters`, and change nothing else.
 */
export const PIN = { x: 262, y: 612, h: 60, t: 12, on: "map", turn: -30, shape: "chevron" as "chevron" | "teardrop" };
/**
 * The teardrop alternative: a round head of radius r page px on a point, PIN.h tall,
 * `segs` flat arc segments (12 keeps both posters at 6,594 B gzip, under the 7 KB budget;
 * the chevron's are 5,931 B, measured 2 Oct 2026).
 */
export const TEARDROP = { r: 18, segs: 12 };

export type PoseKey = "desk" | "phone";
export interface PoseDef {
  /** Reference box the poster is drawn for (CSS px) and its aspect. */
  vw: number;
  vh: number;
  ref: number;
  /** Vertical field of view at the reference aspect, degrees. */
  fov: number;
  /** Camera azimuth / elevation the frame was fitted from, degrees (and the fit margin). */
  az: number;
  el: number;
  margin: number;
  /** The frozen camera frame (world units). The camera NEVER moves. */
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}
/**
 * desk: the lg layout (1024 px and up), a 5:6 box. phone: below 1024 px, a 13:9
 * band, a runway view with the map and pin near and large. Frames were fitted with
 * the prototype's framePose (PAGE.t = 0); `node scripts/build-hero-poster.mjs --fit`
 * re-runs that fit after an az/el change (tunable +-6 deg), then paste the result here.
 */
export const POSES: Record<PoseKey, PoseDef> = {
  desk: { vw: 480, vh: 576, ref: 480 / 576, fov: 30, az: 6, el: 44, margin: 0.06, position: [0.6325, 8.2253, 9.3225], target: [-0.2995, -0.3856, 0.4545] },
  phone: { vw: 390, vh: 270, ref: 390 / 270, fov: 30, az: 12, el: 27, margin: 0.04, position: [1.0369, 3.1993, 7.8394], target: [-0.5293, -0.6388, 0.4713] },
};
/** The pose for a layout width: the art box changes shape at Tailwind's lg (1024 px). */
export const DESK_MIN_WIDTH = 1024;

/** Key light at rest: azimuth 0 = from the front (+Z, camera side), negative = from the left. */
export const LIGHT = { az: -45, el: 55 };

export interface Theme extends Record<Role, string> {
  pin: string;
  /** Shadow colour in LINEAR RGB, and its alpha. */
  shadow: readonly [number, number, number];
  shadowA: number;
  key: { color: string; i: number };
  hemi: { sky: string; ground: string; i: number };
  /** Plan hairlines: colour and opacity (crop marks use 1.6 times the opacity). */
  line: string;
  lineA: number;
  /** The page behind the transparent canvas (index.css --background). */
  ground: string;
  /** What the e2e token check expects: the title1 top face and the pin's lit face. */
  tokenTop: string;
  tokenPin: string;
}
/** Albedos (spec 3.6), calibrated so top faces render at the site tokens. */
export const THEMES: Record<"light" | "dark", Theme> = {
  light: {
    slab: "#E8EEFB", chip: "#123068", chip2: "#94A3B8", photo: "#C3D2F2", ink: "#123068", muted: "#94A3B8",
    button: "#123068", row: "#CBD5E1", row2: "#94A3B8", map: "#E2E8F0", road: "#FFFFFF",
    pin: "#9E7E28", // its lit face renders as gold-700 #8C6F22
    shadow: [0.03, 0.08, 0.2], shadowA: 0.28,
    key: { color: "#FFF8EE", i: 2.4 },
    hemi: { sky: "#FFFFFF", ground: "#CBD5E1", i: 1.5 },
    line: "#123068", lineA: 0.34,
    ground: "#F8FAFC", tokenTop: "#123068", tokenPin: "#8C6F22",
  },
  dark: {
    // ink: calibrated like the pin, so the title bars' top face renders at the token #E8EEFB
    // (spec 3.6 heading and the 11.2 token check). The table's #E8EEFB used as the albedo
    // rendered #ECEDF5 under the warm key light, 6 short in blue (measured 1 Oct 2026). Blue
    // is at its ceiling here: the key light caps a top face at 249, the token is 251.
    slab: "#142C63", chip: "#C3D2F2", chip2: "#A3B3D1", photo: "#1E4091", ink: "#E4EFFF", muted: "#A3B3D1",
    button: "#2B55B8", row: "#C3D2F2", row2: "#7F93C2", map: "#1A356F", road: "#2B55B8",
    pin: "#FAD86C", // its lit face renders as gold-500 #C8A951
    shadow: [0, 0, 0.02], shadowA: 0.7,
    key: { color: "#FFF4E2", i: 2.6 },
    hemi: { sky: "#E8EEFB", ground: "#081738", i: 1.4 },
    line: "#C3D2F2", lineA: 0.42,
    ground: "#081738", tokenTop: "#E8EEFB", tokenPin: "#C8A951",
  },
};

/** The site curve (src/lib/motion.ts EASE and the Tailwind DEFAULT). */
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Timing, ms after `go` (spec 4.1). The roads finish at 1,645; rest is 1,650. */
export const T = {
  stepMs: 85,
  riseMs: 540,
  restMs: 1650,
  lightMs: 1600,
  lightFrom: { az: -62, el: 30 },
  pinStart: 1250,
  pinFade: 90,
  pinFall: 280,
  pinDrop: 100,
};
/** Desktop lamp: how far the cursor swings the light (deg), the proximity band (half-sizes), easing. */
export const LAMP = { az: 18, el: 8, near: 1.0, far: 1.6, tauMs: 180, epsDeg: 0.05 };
/** Gates checked at first render, before any download (spec 8.1). */
export const GATES = { minMemoryGB: 4, minCores: 4, slowNet: ["slow-2g", "2g", "3g"] as readonly string[] };
/** Start rule and go (spec 8.2, 8.3). */
export const START = { capMs: 2500, idleTimeoutMs: 1000, safariIdleMs: 300, nearMargin: "150% 0px", goRatio: 0.6, watchdogMs: 4000 };
/** Quality (spec 3.10, 8.4, 4.2). */
export const QUALITY = {
  maxPixelsFine: 1.5e6,
  maxPixelsCoarse: 0.6e6,
  dprCap: 2,
  probeFrames: 10,
  probeDiscard: 2,
  probeMedianMs: 8,
  jankMs: 50,
  jankRun: 3,
  /** The jank escape only counts after this many build frames. */
  jankAfter: 10,
  /** Frame cap: skip a rAF when it comes sooner than 1000 / maxFps - slackMs. */
  maxFps: 60,
  slackMs: 2,
};
/** The shadow decal: preallocated vertices, and its lift above each base (world units). */
export const DECAL = { maxVerts: 4096, lift: 0.0008 };
/** sessionStorage key: "off" after a failure keeps the still for the rest of the session. */
export const SESSION_KEY = "ideovent-hero3d";
