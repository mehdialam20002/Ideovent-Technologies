/**
 * The pitch-page modules, in one import.
 *
 *   import { resolvePitchPage, pitchPackage, type PitchPage } from "@/lib/pitch";
 *
 * The model itself is a CMS collection: see `./record`, which is where a new
 * import should point. This barrel is a convenience over the pieces around it.
 *
 * `./international` is deliberately NOT re-exported: it is one design's own
 * argument and its own copy, it is large, and pulling it through the barrel
 * would drag it into the India page's chunk.
 */

export * from "./record";
export * from "./helpers";
export * from "./proof";
