import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/*
  index.html writes %VITE_PUBLIC_URL% into its canonical, og and JSON-LD tags.
  When the variable is unset Vite leaves the placeholder in place, and the
  HTML plugin then fails the whole build on it ("URI malformed"). That is what
  happened to the first Vercel preview of 26 September 2026: the variable is
  set for Production only, so every branch preview failed to build.

  So a build always gets a value. A Vercel preview uses its own address, which
  is where its tags should point anyway (previews sit behind Vercel's login and
  are never indexed). Anything else falls back to the permanent domain, the
  same fallback src/lib/verify.ts and seed.ts use.

  It checks .env as well as process.env before filling in, because Vite gives
  process.env priority over .env files: filling process.env unconditionally
  would silently override the value in a local .env. Vite loads the env after
  this function has run, so setting process.env here is enough.
*/
function ensurePublicUrl(mode: string) {
  if (loadEnv(mode, process.cwd(), "VITE_").VITE_PUBLIC_URL) return;
  process.env.VITE_PUBLIC_URL =
    process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://www.ideovent.in";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  ensurePublicUrl(mode);
  return {
  // Root by default; the GitHub Pages workflow sets DEPLOY_BASE=/Ideovent-Technologies/
  base: process.env.DEPLOY_BASE || "/",
  server: {
    host: true,
    port: 8080,
  },
  plugins: [react()],
  /*
    The home hero's 3D layer runs in a module worker
    (src/components/sections/hero/scene/hero3d.worker.ts). Its tiny entry
    checks for WebGL2 first and only then does `import("./render")`, so a
    visitor without WebGL2 never downloads three.js. A dynamic import inside a
    worker is code splitting, which the default "iife" worker format refuses
    ("UMD and IIFE output formats are not supported for code-splitting
    builds"); "es" emits the entry and a separate render chunk. Firefox before
    114 cannot run module workers: the worker errors and the hero keeps its
    drawn still. The render chunk (three.js, about 545 KB raw) is over
    chunkSizeWarningLimit below on purpose, a documented exception for this
    one worker chunk; scripts/check-hero-3d.mjs holds its own budget.
  */
  worker: { format: "es" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // jsPDF dynamically imports html2canvas and canvg for doc.html() and
      // doc.addSvgAsImage(). The certificate exporter uses neither. It calls
      // addImage() with its own 300 DPI canvas. But Rollup still emitted them
      // as 201.42 kB + 151.05 kB of chunks nothing can reach (measured by
      // building both ways). jsPDF's third optional import, dompurify, is NOT
      // aliased: src/lib/sanitize.ts imports the same specifier for real.
      // Read the stub before removing this: src/lib/jspdf-optional-stub.ts.
      html2canvas: path.resolve(__dirname, "./src/lib/jspdf-optional-stub.ts"),
      canvg: path.resolve(__dirname, "./src/lib/jspdf-optional-stub.ts"),
    },
  },
  build: {
    // Routes are already split with React.lazy; what was left was one 1.5 MB vendor blob.
    // Splitting it by library means a visitor downloads four cacheable files in parallel
    // instead of one serial monolith, and a content or page change stops invalidating React.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          const p = id.split("node_modules/").pop() || "";
          if (/^(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[/@]/.test(p)) return "react-vendor";
          if (/^(framer-motion|motion-dom|motion-utils)[/@]/.test(p)) return "motion";
          /*
            NO "radix" CHUNK ANY MORE (1 Oct 2026, SEO audit P1-2). Every @radix-ui
            package, floating-ui and react-remove-scroll went into ONE 96 KB chunk
            that every public page preloaded, because the error boundary's
            <Button> pulls in @radix-ui/react-slot. Public pages use Slot and
            nothing else now (the FAQ accordions are native <details>), so 84% of
            that chunk was admin and CRM dialogs, menus and popovers. Without the
            rule Rollup puts Slot with the entry and the rest in the admin and
            CRM chunks that actually use it.
          */
          if (/^(@supabase|iceberg-js)/.test(p)) return "supabase";
        },
      },
    },
    // Nothing should be over this once the above lands; leave the warning armed so a
    // regression is noisy rather than silent.
    chunkSizeWarningLimit: 400,
  },
  };
});
