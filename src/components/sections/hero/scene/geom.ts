/**
 * Geometry, timing and shading for the hero scene, shared by the worker (render.ts)
 * and the poster generator (poster.ts), so the canvas and the drawn stills agree.
 * Pure maths, NO three import. The per-frame writers fill preallocated typed arrays;
 * nothing in the frame loop allocates. Spec: _build/specs/hero-3d-spec.md 3, 4, 7.3.
 */
import { CHEVRON, DECAL, EASE, LIGHT, PAGE, PIECES, PIN, PX, T, TAPER, TEARDROP, type Theme } from "./model";

export const DEG = Math.PI / 180;
export type V3 = [number, number, number];
export type V2 = [number, number];

/** cubic-bezier(x1, y1, x2, y2) as a function of progress, solved like CSS does. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
/** The site curve. */
export const ease = /*#__PURE__*/ cubicBezier(EASE[0], EASE[1], EASE[2], EASE[3]);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Page px to world X / Z. */
export const wx = (x: number) => (x - PAGE.w / 2) * PX;
export const wz = (y: number) => (y - PAGE.d / 2) * PX;

/** Unit vector pointing TO the light. az 0 = from the front (+Z, the camera side); negative = from the left. */
export function lightDir(az: number = LIGHT.az, el: number = LIGHT.el, out: V3 = [0, 0, 0]): V3 {
  const a = az * DEG, e = el * DEG;
  out[0] = Math.cos(e) * Math.sin(a);
  out[1] = Math.sin(e);
  out[2] = Math.cos(e) * Math.cos(a);
  return out;
}

/** The meet rule (SVG xMidYMid meet): keep fov when the box is at least as wide as the reference, else widen it. */
export function meetFov(fov: number, ref: number, aspect: number): number {
  return aspect >= ref ? fov : (2 * Math.atan((Math.tan((fov * DEG) / 2) * ref) / aspect)) / DEG;
}

/* ── Parts ─────────────────────────────────────────────────────────────────── */

/** Index of each part's support (-1 = the page). */
export const SUPPORT: readonly number[] = /*#__PURE__*/ PIECES.map((p) => PIECES.findIndex((q) => q.id === p.on));
export const MAP_INDEX: number = /*#__PURE__*/ PIECES.findIndex((p) => p.id === PIN.on);

/** Top inset at full height, page px: walls lean in at the V-blade angle, square corners. */
export const fullInset = (w: number, d: number, h: number) => Math.min(h * TAPER, Math.min(w, d) / 2 - 0.5);

/** Base height (page px) of part i NOW: a stacked part rides the current top of its support. */
export function currentBase(i: number, ks: ArrayLike<number>): number {
  const s = SUPPORT[i];
  return s < 0 ? PAGE.t : currentBase(s, ks) + PIECES[s].h * ks[s];
}

export interface Face {
  kind: "back" | "right" | "front" | "left" | "top" | string;
  /** Corners in world units, counter-clockwise seen from outside. */
  pts: V3[];
  n: V3;
}

/**
 * A tapered block, footprint w x d and height h (page px) at height progress k:
 * height and inset scale together, so the wall angle never changes. World units,
 * base at y = 0, footprint centred on 0. No bottom face (never seen).
 */
export function blockFaces(w: number, d: number, h: number, k = 1): Face[] {
  const hw = (w / 2) * PX, hd = (d / 2) * PX;
  const H = h * k * PX, ins = fullInset(w, d, h) * k * PX;
  const tw = hw - ins, td = hd - ins;
  const b: V3[] = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]];
  const t: V3[] = [[-tw, H, -td], [tw, H, -td], [tw, H, td], [-tw, H, td]];
  const [s, c] = wallSinCos(w, d, h);
  return [
    { kind: "back", pts: [b[1], b[0], t[0], t[1]], n: [0, s, -c] },
    { kind: "right", pts: [b[2], b[1], t[1], t[2]], n: [c, s, 0] },
    { kind: "front", pts: [b[3], b[2], t[2], t[3]], n: [0, s, c] },
    { kind: "left", pts: [b[0], b[3], t[3], t[0]], n: [-c, s, 0] },
    { kind: "top", pts: [t[0], t[3], t[2], t[1]], n: [0, 1, 0] },
  ];
}
/** sin and cos of a block's wall lean (constant for every k > 0). */
export function wallSinCos(w: number, d: number, h: number): V2 {
  const a = Math.atan2(fullInset(w, d, h), Math.max(h, 1e-6));
  return [Math.sin(a), Math.cos(a)];
}

/** Vertices per block: 5 quads, 10 triangles. */
export const BLOCK_VERTS = 30;

/**
 * Writes a block's 30 positions for height progress k into `out` (no allocation),
 * as blockFaces() would, each quad [a, b, c, d] as triangles (a, b, c) and (a, c, d).
 */
export function writeBlock(out: Float32Array, w: number, d: number, h: number, k: number): void {
  const hw = (w / 2) * PX, hd = (d / 2) * PX;
  const H = h * k * PX, ins = fullInset(w, d, h) * k * PX;
  const tw = hw - ins, td = hd - ins;
  let o = 0;
  const v = (x: number, y: number, z: number) => {
    out[o++] = x;
    out[o++] = y;
    out[o++] = z;
  };
  const quad = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, dx: number, dy: number, dz: number) => {
    v(ax, ay, az); v(bx, by, bz); v(cx, cy, cz);
    v(ax, ay, az); v(cx, cy, cz); v(dx, dy, dz);
  };
  quad(hw, 0, -hd, -hw, 0, -hd, -tw, H, -td, tw, H, -td); // back
  quad(hw, 0, hd, hw, 0, -hd, tw, H, -td, tw, H, td); // right
  quad(-hw, 0, hd, hw, 0, hd, tw, H, td, -tw, H, td); // front
  quad(-hw, 0, -hd, -hw, 0, hd, -tw, H, td, -tw, H, -td); // left
  quad(-tw, H, -td, -tw, H, td, tw, H, td, tw, H, -td); // top
}
/** The block's 30 normals, in writeBlock's order. Constant: the wall angle never changes. */
export function writeBlockNormals(out: Float32Array, w: number, d: number, h: number): void {
  const [s, c] = wallSinCos(w, d, h);
  const ns: V3[] = [[0, s, -c], [c, s, 0], [0, s, c], [-c, s, 0], [0, 1, 0]];
  let o = 0;
  for (const n of ns) for (let i = 0; i < 6; i++) { out[o++] = n[0]; out[o++] = n[1]; out[o++] = n[2]; }
}

/* ── The pin ───────────────────────────────────────────────────────────────── */

/**
 * The pin's outline in page px, tip at (0, 0), y up, counter-clockwise seen from its
 * front, with its face triangles. The chevron is concave (the notch), so it is split
 * into two triangles along the line from the tip to the notch.
 */
export function pinOutline(shape: "chevron" | "teardrop" = PIN.shape): { pts: V2[]; tris: [number, number, number][] } {
  if (shape === "teardrop") {
    const { r, segs } = TEARDROP;
    const cy = PIN.h - r;
    const beta = Math.acos(r / cy); // angle at the centre between "down to the tip" and a tangent point
    const pts: V2[] = [[0, 0]];
    for (let i = 0; i <= segs; i++) {
      const a = -Math.PI / 2 + beta + ((2 * Math.PI - 2 * beta) * i) / segs;
      pts.push([r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const tris: [number, number, number][] = [];
    for (let i = 1; i < pts.length - 1; i++) tris.push([0, i, i + 1]);
    return { pts, tris };
  }
  const s = PIN.h / (CHEVRON[3][1] - CHEVRON[0][1]);
  const p: V2[] = CHEVRON.map(([x, y]) => [(x - CHEVRON[3][0]) * s, (CHEVRON[3][1] - y) * s]);
  // CHEVRON runs clockwise in y-up coordinates; reversed: tip, top right, notch, top left.
  return { pts: [p[3], p[2], p[1], p[0]], tris: [[0, 1, 2], [0, 2, 3]] };
}

/**
 * The pin as a prism PIN.t deep, centred on its own plane, tip at the local origin,
 * turned to face azimuth faceAz (degrees). World units. Faces are CCW from outside;
 * front and back carry their triangles in `tris`.
 */
export function pinFaces(faceAz: number, shape: "chevron" | "teardrop" = PIN.shape): (Face & { tris?: [number, number, number][] })[] {
  const { pts, tris } = pinOutline(shape);
  const hz = (PIN.t / 2) * PX;
  const a = faceAz * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const rot = (x: number, y: number, z: number): V3 => [x * ca + z * sa, y, -x * sa + z * ca];
  const front = pts.map(([x, y]) => rot(x * PX, y * PX, hz));
  const back = pts.map(([x, y]) => rot(x * PX, y * PX, -hz));
  const faces: (Face & { tris?: [number, number, number][] })[] = [
    { kind: "front", pts: front, n: rot(0, 0, 1), tris },
    { kind: "back", pts: back, n: rot(0, 0, -1), tris: tris.map(([i, j, k]) => [i, k, j] as [number, number, number]) },
  ];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1];
    const l = Math.hypot(ex, ey) || 1;
    faces.push({ kind: "edge" + i, pts: [front[i], back[i], back[j], front[j]], n: rot(ey / l, -ex / l, 0) });
  }
  return faces;
}

/** Triangle soup of a face list: positions and flat normals (setup only, allocates). */
export function faceTriangles(faces: (Face & { tris?: [number, number, number][] })[]): { pos: number[]; nrm: number[] } {
  const pos: number[] = [], nrm: number[] = [];
  for (const f of faces) {
    const tris = f.tris || f.pts.slice(2).map((_, i) => [0, i + 1, i + 2] as [number, number, number]);
    for (const tri of tris) for (const vi of tri) { pos.push(...f.pts[vi]); nrm.push(...f.n); }
  }
  return { pos, nrm };
}

/* ── Colour: sRGB <-> linear, and the Lambert model three r186 uses ───────── */

export const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
export function hexLin(hex: string): V3 {
  const n = parseInt(hex.slice(1), 16);
  return [toLin(((n >> 16) & 255) / 255), toLin(((n >> 8) & 255) / 255), toLin((n & 255) / 255)];
}
export function linHex(rgb: readonly number[]): string {
  return "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(1, toSrgb(v))) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
/** out = albedo/PI x (max(0, N.L) x key x I_key + mix(ground, sky, 0.5 + 0.5 N.y) x I_hemi), linear. */
export function shade(albedoHex: string, n: readonly number[], L: readonly number[], theme: Theme): V3 {
  const a = hexLin(albedoHex), kc = hexLin(theme.key.color), sky = hexLin(theme.hemi.sky), gr = hexLin(theme.hemi.ground);
  const dNL = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  const w = 0.5 + 0.5 * n[1];
  return a.map((ai, i) => (ai / Math.PI) * (dNL * kc[i] * theme.key.i + (gr[i] + (sky[i] - gr[i]) * w) * theme.hemi.i)) as V3;
}

/* ── The timeline: one pure function of time ───────────────────────────────── */

export interface Pose {
  /** Height progress of each part, PIECES order, 0 to 1. */
  ks: Float64Array;
  pinShow: boolean;
  /** 0 to 1, linear over the first T.pinFade ms, so the pin never pops in mid-air. */
  pinOpacity: number;
  /** How far the pin's tip is above its landing point, page px. */
  pinDrop: number;
  /** Key light angles, degrees. */
  lightAz: number;
  lightEl: number;
}
export function makePose(): Pose {
  return { ks: new Float64Array(PIECES.length), pinShow: false, pinOpacity: 0, pinDrop: T.pinDrop, lightAz: T.lightFrom.az, lightEl: T.lightFrom.el };
}
/**
 * The scene at `ms` after go (spec 4.1). pose(0): every height 0, pin hidden, light
 * at (-62, 30). pose(T.restMs) and pose(Infinity): rest, exactly. Writes into `out`.
 */
export function pose(ms: number, out: Pose = makePose()): Pose {
  const t = ms >= T.restMs ? T.restMs : ms > 0 ? ms : 0;
  for (let i = 0; i < PIECES.length; i++) out.ks[i] = ease(clamp01((t - PIECES[i].step * T.stepMs) / T.riseMs));
  const u = clamp01((t - T.pinStart) / T.pinFall);
  out.pinShow = t >= T.pinStart;
  out.pinOpacity = clamp01((t - T.pinStart) / T.pinFade);
  out.pinDrop = (1 - u * u) * T.pinDrop; // it falls, so it accelerates; it stops on contact
  const lu = ease(clamp01(t / T.lightMs)); // the ANGLES are interpolated, not xyz
  out.lightAz = T.lightFrom.az + (LIGHT.az - T.lightFrom.az) * lu;
  out.lightEl = T.lightFrom.el + (LIGHT.el - T.lightFrom.el) * lu;
  return out;
}

/* ── Shadows: the hull of base and top, projected along the light, softened by a ring ── */

/** Convex hull, counter-clockwise in (x, z) (positive area). Allocates: poster and tests only. */
export function hull2(points: V2[]): V2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [], up: V2[] = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** A block's shadow outline on its base plane, world (x, z): t = y / max(L.y, 0.15). Allocates. */
export function blockShadowHull(cx: number, cz: number, w: number, d: number, h: number, k: number, L: readonly number[]): V2[] {
  const hw = (w / 2) * PX, hd = (d / 2) * PX, ins = fullInset(w, d, h) * k * PX;
  const t = (h * k * PX) / Math.max(L[1], 0.15), ox = -L[0] * t, oz = -L[2] * t;
  const pts: V2[] = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    pts.push([cx + sx * hw, cz + sz * hd]);
    pts.push([cx + sx * (hw - ins) + ox, cz + sz * (hd - ins) + oz]);
  }
  return hull2(pts);
}
/** The pin's shadow outline: its corners at height (y + drop) projected onto its base plane. Allocates. */
export function pinShadowHull(px: number, pz: number, corners: readonly V3[], drop: number, L: readonly number[]): V2[] {
  const ly = Math.max(L[1], 0.15);
  return hull2(corners.map(([x, y, z]) => [px + x - (L[0] * (y + drop)) / ly, pz + z - (L[2] * (y + drop)) / ly] as V2));
}
/** The prototype's quick shadow box (kept from geom.js; the scene uses the hulls). */
export function shadowRect(cx: number, cz: number, w: number, d: number, h: number, L: readonly number[], k = 1) {
  const horiz = Math.hypot(L[0], L[2]) || 1;
  const cot = horiz / Math.max(L[1], 0.2);
  const ox = (-L[0] / horiz) * h * cot * PX * k, oz = (-L[2] / horiz) * h * cot * PX * k;
  return { cx: cx + ox / 2, cz: cz + oz / 2, hw: (w / 2) * PX + Math.abs(ox) / 2, hd: (d / 2) * PX + Math.abs(oz) / 2, soft: (2.5 + 0.9 * h) * PX };
}

const CAP = 96; // points per shadow outline (a teardrop pin has 2 x 16 corners)
/**
 * Writes soft shadows into the decal's preallocated position (xyz) and colour (rgba)
 * arrays, in place, every changed frame. Each shadow is its hull (inner offset at full
 * alpha) plus a ring out to alpha 0, with its 50% line on the hard edge. Triangles
 * are wound counter-clockwise seen from above, so the decal draws front faces only.
 */
export class DecalWriter {
  count = 0;
  private readonly max: number;
  private readonly px = new Float64Array(CAP);
  private readonly pz = new Float64Array(CAP);
  private readonly hx = new Float64Array(CAP);
  private readonly hz = new Float64Array(CAP);
  private readonly ix = new Float64Array(CAP);
  private readonly iz = new Float64Array(CAP);
  private readonly ox = new Float64Array(CAP);
  private readonly oz = new Float64Array(CAP);
  private readonly ord = new Int32Array(CAP);
  private readonly stk = new Int32Array(2 * CAP);
  constructor(private readonly pos: Float32Array, private readonly col: Float32Array) {
    this.max = Math.floor(pos.length / 3);
  }
  begin() {
    this.count = 0;
  }
  /** Shadow of a block standing at world (cx, baseY, cz); soft in world units. */
  block(cx: number, baseY: number, cz: number, w: number, d: number, h: number, k: number, L: readonly number[], soft: number, alpha: number, rgb: readonly number[]) {
    const hw = (w / 2) * PX, hd = (d / 2) * PX, ins = fullInset(w, d, h) * k * PX;
    const t = (h * k * PX) / Math.max(L[1], 0.15), sx = -L[0] * t, sz = -L[2] * t;
    let n = 0;
    for (let c = 0; c < 4; c++) {
      const fx = c === 1 || c === 2 ? 1 : -1, fz = c >= 2 ? 1 : -1;
      this.px[n] = cx + fx * hw; this.pz[n++] = cz + fz * hd;
      this.px[n] = cx + fx * (hw - ins) + sx; this.pz[n++] = cz + fz * (hd - ins) + sz;
    }
    this.ring(this.hull(n), baseY, soft, alpha, rgb);
  }
  /** Shadow of the pin: its corners (local, world units, tip at 0) at height y + drop, onto its base plane. */
  pin(px: number, baseY: number, pz: number, corners: Float32Array, drop: number, L: readonly number[], soft: number, alpha: number, rgb: readonly number[]) {
    const ly = Math.max(L[1], 0.15);
    const n = Math.min(CAP, corners.length / 3);
    for (let i = 0; i < n; i++) {
      const y = corners[3 * i + 1] + drop;
      this.px[i] = px + corners[3 * i] - (L[0] * y) / ly;
      this.pz[i] = pz + corners[3 * i + 2] - (L[2] * y) / ly;
    }
    this.ring(this.hull(n), baseY, soft, alpha, rgb);
  }
  /** Andrew's monotone chain over px/pz[0..n) into hx/hz; returns the hull size (counter-clockwise in x, z). */
  private hull(n: number): number {
    const { px, pz, ord, stk } = this;
    for (let i = 0; i < n; i++) {
      let j = i;
      while (j > 0 && (px[ord[j - 1]] > px[i] || (px[ord[j - 1]] === px[i] && pz[ord[j - 1]] > pz[i]))) { ord[j] = ord[j - 1]; j--; }
      ord[j] = i;
    }
    let k = 0;
    for (let i = 0; i < n; i++) {
      while (k >= 2 && this.cross(stk[k - 2], stk[k - 1], ord[i]) <= 0) k--;
      stk[k++] = ord[i];
    }
    for (let i = n - 2, lo = k + 1; i >= 0; i--) {
      while (k >= lo && this.cross(stk[k - 2], stk[k - 1], ord[i]) <= 0) k--;
      stk[k++] = ord[i];
    }
    const m = Math.max(0, k - 1);
    for (let i = 0; i < m; i++) { this.hx[i] = px[stk[i]]; this.hz[i] = pz[stk[i]]; }
    return m;
  }
  /** Mitred offset of the hull by d (positive = outward), clamped at sharp corners. */
  private offset(n: number, d: number, outX: Float64Array, outZ: Float64Array) {
    const { hx, hz } = this;
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n, c = (i + 1) % n;
      let e1x = hx[i] - hx[a], e1z = hz[i] - hz[a], e2x = hx[c] - hx[i], e2z = hz[c] - hz[i];
      const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1;
      e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
      let mx = e1z + e2z, mz = -e1x - e2x; // sum of the two outward edge normals (ez, -ex)
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml; mz /= ml;
      const cosHalf = Math.max(0.35, mx * e1z - mz * e1x);
      outX[i] = hx[i] + (mx * d) / cosHalf;
      outZ[i] = hz[i] + (mz * d) / cosHalf;
    }
  }
  /** True while every inner edge still runs the same way as its hull edge (the inward offset has not folded). */
  private unfolded(n: number): boolean {
    const { hx, hz, ix, iz } = this;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if ((ix[j] - ix[i]) * (hx[j] - hx[i]) + (iz[j] - iz[i]) * (hz[j] - hz[i]) <= 0) return false;
    }
    return true;
  }
  private ring(n: number, baseY: number, soft: number, alpha: number, rgb: readonly number[]) {
    if (n < 3 || alpha <= 0.001 || this.count + 9 * n > this.max) return;
    const { ix, iz, ox, oz } = this;
    this.offset(n, -soft / 2, ix, iz);
    if (!this.unfolded(n)) {
      // A short hull edge vanishes before soft/2 (the pin's 12 px depth while its shadow is
      // wide, t 1380 to 1470), and past that the mitred inner polygon folds over itself into
      // hard-edged slivers. Pull in only as far as it stays unfolded; the outer edge is unchanged.
      let lo = 0, hi = soft / 2;
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        this.offset(n, -mid, ix, iz);
        if (this.unfolded(n)) lo = mid;
        else hi = mid;
      }
      this.offset(n, -lo, ix, iz);
    }
    this.offset(n, soft / 2, ox, oz);
    let ia = 0, cx = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      ia += ix[i] * iz[j] - ix[j] * iz[i];
      cx += this.hx[i] / n; cz += this.hz[i] / n;
    }
    let a = alpha;
    if (!(ia > 1e-7)) {
      // too thin for an inner polygon: fade from the centre instead
      for (let i = 0; i < n; i++) { ix[i] = cx; iz[i] = cz; }
      a = alpha * 0.55;
    }
    const y = baseY + DECAL.lift;
    for (let i = 1; i < n - 1; i++) {
      this.put(ix[0], y, iz[0], a, rgb); this.put(ix[i + 1], y, iz[i + 1], a, rgb); this.put(ix[i], y, iz[i], a, rgb);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.put(ix[i], y, iz[i], a, rgb); this.put(ox[j], y, oz[j], 0, rgb); this.put(ox[i], y, oz[i], 0, rgb);
      this.put(ix[i], y, iz[i], a, rgb); this.put(ix[j], y, iz[j], a, rgb); this.put(ox[j], y, oz[j], 0, rgb);
    }
  }
  private put(x: number, y: number, z: number, al: number, rgb: readonly number[]) {
    const v = this.count++;
    this.pos[3 * v] = x; this.pos[3 * v + 1] = y; this.pos[3 * v + 2] = z;
    this.col[4 * v] = rgb[0]; this.col[4 * v + 1] = rgb[1]; this.col[4 * v + 2] = rgb[2]; this.col[4 * v + 3] = al;
  }
  private cross(o: number, a: number, b: number) {
    const { px, pz } = this;
    return (px[a] - px[o]) * (pz[b] - pz[o]) - (pz[a] - pz[o]) * (px[b] - px[o]);
  }
}
