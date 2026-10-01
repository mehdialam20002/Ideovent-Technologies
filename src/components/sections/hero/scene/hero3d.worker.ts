/**
 * The home hero's 3D worker: the ENTRY ONLY, kept tiny on purpose (budget 3 KB gzip).
 *
 * It asks for a WebGL2 context on the transferred OffscreenCanvas BEFORE three.js is
 * fetched. No context (Googlebot, software GL behind failIfMajorPerformanceCaveat, a
 * blocklisted GPU, Safari 16) posts `fail` and three.js is never downloaded. With a
 * context it imports ./render (three.js and the scene, its own chunk) and hands every
 * later message to it; messages that arrive while that chunk loads are queued.
 *
 * Typed with the DOM lib the rest of src uses: `postMessage(obj)` matches the
 * one-argument overload, so no webworker lib reference is needed (it collides with DOM
 * in `tsc -b`). vite.config.ts sets `worker.format: "es"`, which is what allows the
 * dynamic import inside a worker. Spec: _build/specs/hero-3d-spec.md, 7.6 and 3.10.
 */
type In = { type: string; [k: string]: unknown };

const ATTRS: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: true,
  depth: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: "low-power",
  failIfMajorPerformanceCaveat: true,
};

let impl: ((m: In) => void) | null = null;
const queue: In[] = [];

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data;
  if (m.type !== "init") {
    if (impl) impl(m);
    else queue.push(m);
    return;
  }
  try {
    const canvas = m.canvas as OffscreenCanvas;
    const gl = canvas.getContext("webgl2", ATTRS) as WebGL2RenderingContext | null;
    if (!gl) {
      postMessage({ type: "fail", reason: "nowebgl" }); // three.js never downloads
      return;
    }
    const { start } = await import("./render");
    impl = await start(gl, canvas, m, (out: object) => postMessage(out));
    if (impl) for (const q of queue.splice(0)) impl(q);
  } catch {
    postMessage({ type: "fail", reason: "error" });
  }
};
