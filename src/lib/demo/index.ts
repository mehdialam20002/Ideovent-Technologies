/**
 * The demo-site modules, in one import.
 *
 *   import { resolveDemoSite, demoFee, type DemoSite } from "@/lib/demo";
 *
 * The model itself is in `./record`, which is where a new import should point.
 * This barrel is a convenience over the pieces around it.
 *
 * TWO MODULES ARE DELIBERATELY NOT RE-EXPORTED.
 *
 *   ./reservedRoutes reaches through to the pitch guard, which holds the text
 *   of src/App.tsx and vercel.json. Only the admin validates a slug. Pulling it
 *   through here would put the route table into every template's chunk.
 *
 *   ./opens writes. It belongs to the one component that records an open, and
 *   nothing that merely reads a demo should be able to reach it by accident.
 *
 * ./slots IS re-exported: `relativeTime` and `demoOpenStats` are pure and the
 * admin is the only thing that imports this barrel plus those.
 */

export * from "./record";
export * from "./slots";
