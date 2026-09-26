/**
 * COMPATIBILITY RE-EXPORT. The pitch model does not live here.
 *
 * It lives on `ContentData` in `@/lib/cms/types`, because a pitch page is a
 * CMS collection: Mehdi creates one in /admin, it is stored in Supabase, and
 * the record is the document. `@/lib/pitch/record` is the module that wraps it
 * with everything neither page design should decide for itself, the price
 * table, slug rules, lookup by URL, and the small shared formatters.
 *
 * This file exists so that `import { ... } from "./types"`, which was written
 * against an earlier standalone draft of the model, keeps resolving, and
 * resolves to the CANONICAL shape rather than to a second one. There is
 * exactly one PitchPage in this codebase and it is the CMS document.
 *
 * WHAT CHANGED, if you are here because a type stopped matching:
 *
 *   PitchDirector { name, title }   ->  page.directorName, page.directorTitle
 *                                       (or `pitchAddressee(page)`)
 *   PitchProspectContact            ->  GONE, and it may not come back. The
 *                                       collection is world-readable, so a
 *                                       prospect's phone or email stored on a
 *                                       record is a published phone or email.
 *                                       Only `currentWebsite` survives.
 *   PitchPackage { priceFrom, ... } ->  PitchPackageOption, looked up with
 *                                       `pitchPackage(page)`. The price is a
 *                                       preformatted `range` string from
 *                                       PITCH_PACKAGES, never a number on the
 *                                       record, so a page cannot quote a
 *                                       figure /pricing has moved on from.
 *   package.includes                ->  page.proposedScope
 *   page.proof[]                    ->  GONE. Each design picks its own proof,
 *                                       see `defaultProofOrder` in ./proof.
 *   page.sample                     ->  page.isExample
 *   page.city (required)            ->  optional, as is almost everything.
 *                                       Render sensibly with it empty.
 *
 * Prefer importing from "./record" in new code.
 */

export type {
  PitchPage,
  PitchMarket,
  PitchStatus,
  PitchInstituteType,
  PitchObservedProblem,
} from "@/lib/cms/types";

export type {
  PitchPackageOption,
  /** Old name for PitchPackageOption. The shape is NOT the old shape: see above. */
  PitchPackageOption as PitchPackage,
} from "./record";
