import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // Root by default; the GitHub Pages workflow sets DEPLOY_BASE=/Ideovent-Technologies/
  base: process.env.DEPLOY_BASE || "/",
  server: {
    host: true,
    port: 8080,
  },
  plugins: [react()],
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
          if (/^(@radix-ui|@floating-ui|aria-hidden|react-remove-scroll)/.test(p)) return "radix";
          if (/^(@supabase|iceberg-js)/.test(p)) return "supabase";
        },
      },
    },
    // Nothing should be over this once the above lands; leave the warning armed so a
    // regression is noisy rather than silent.
    chunkSizeWarningLimit: 400,
  },
}));
