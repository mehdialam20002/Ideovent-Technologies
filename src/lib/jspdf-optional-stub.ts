/**
 * An empty module standing in for jsPDF's optional dependencies.
 *
 * jsPDF ships three dynamic imports it only needs for features this site does
 * not use:
 *
 *   html2canvas   for  doc.html(), rasterising a DOM subtree
 *   canvg         for  doc.addSvgAsImage(), rendering SVG into the page
 *   dompurify     for  the sanitising step inside doc.html()
 *
 * The certificate exporter calls `doc.addImage()` with a PNG data URL produced
 * by our own 300 DPI canvas (see exportCertificate.ts), so none of those three
 * ever runs. Rollup still sees the dynamic imports and emits them as chunks
 * sitting in dist/ as files no code path can ever fetch.
 *
 * WHAT THIS ALIAS ACTUALLY REMOVES, re-measured 24 Sep 2026 by building with
 * and without it and diffing dist/:
 *
 *   html2canvas.esm   201.42 kB   gone
 *   canvg (index.es)  151.05 kB   gone
 *   dompurify         22.03 kB    STILL THERE
 *
 * 352 kB, not 374. Two of the three, not three.
 *
 * dompurify is deliberately NOT aliased, and cannot be: `src/lib/sanitize.ts`
 * imports it for real, to sanitise blog HTML before it is set as innerHTML.
 * Both importers ask for the same bare specifier "dompurify", so an alias that
 * emptied jsPDF's copy would empty the one doing the sanitising too, trading
 * 22 kB of unreachable chunk for an XSS hole on /blog/: slug. So
 * `purify.es-*.js` is still emitted and is still unreachable, because jsPDF
 * only reaches for it inside `doc.html()`. Leave it.
 *
 * IF YOU EVER CALL `doc.html()` OR `doc.addSvgAsImage()`, delete the alias in
 * vite.config.ts first. It will fail at runtime otherwise, and it will fail in
 * the exported file rather than on screen.
 */
export default {};
