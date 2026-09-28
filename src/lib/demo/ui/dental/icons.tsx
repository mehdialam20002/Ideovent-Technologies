/**
 * DENTAL ICONS. One component, `DentalGlyph`, keyed by `DentalIcon`
 * (src/lib/cms/types.ts). Line icons at 1.75 stroke, `currentColor`.
 *
 * lucide-react has no tooth, so `ToothIcon` below is drawn here; the kit
 * builder may add custom drawings for braces, aligner, implant and root
 * canal. Decorative: always aria-hidden, the label beside it says the thing.
 */

import type { SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Accessibility, Activity, AlertTriangle, Baby, Brush, CalendarDays, Clock, Crown, Droplets,
  Gem, Globe, Heart, HeartPulse, IndianRupee, Layers, Link2, Microscope, Scan, ScanLine, ShieldCheck,
  Siren, Smile, Sparkles, SquareParking, Stethoscope, TrainFront, Users, UserRound, Waves, Zap,
} from "lucide-react";
import type { DentalIcon } from "@/lib/cms/types";

type Svg = LucideIcon | typeof ToothIcon;

/** A molar in outline, drawn to match lucide's 24px grid and 2px stroke. */
export function ToothIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.5 3.5c-2.3 0-4 1.8-4 4.3 0 2 .7 3.3 1.3 4.6.6 1.3.8 2.9 1.1 4.6.3 2 .9 3.5 1.9 3.5 1.2 0 1.5-1.6 1.9-3.4.3-1.4.8-2.6 2.3-2.6s2 1.2 2.3 2.6c.4 1.8.7 3.4 1.9 3.4 1 0 1.6-1.5 1.9-3.5.3-1.7.5-3.3 1.1-4.6.6-1.3 1.3-2.6 1.3-4.6 0-2.5-1.7-4.3-4-4.3-1.6 0-2.6.9-4.5.9s-2.9-.9-4.5-.9Z" />
    </svg>
  );
}

const MAP: Record<DentalIcon, Svg> = {
  tooth: ToothIcon, checkup: Stethoscope, cleaning: Brush, filling: Layers, "root-canal": Activity,
  crown: Crown, bridge: Link2, implant: ToothIcon, denture: Smile, extraction: ToothIcon, wisdom: ToothIcon,
  braces: Link2, aligner: Gem, retainer: Gem, whitening: Sparkles, veneer: Sparkles, smile: Smile,
  gum: HeartPulse, kids: Baby, sealant: ShieldCheck, fluoride: Droplets, emergency: Siren,
  pain: Zap, swelling: Waves, broken: AlertTriangle, xray: Scan, scan: ScanLine, cbct: Scan,
  laser: Zap, microscope: Microscope, sterile: ShieldCheck, calendar: CalendarDays, clock: Clock,
  shield: ShieldCheck, heart: Heart, globe: Globe, rupee: IndianRupee, family: Users, senior: UserRound,
  accessible: Accessibility, parking: SquareParking, metro: TrainFront,
};

/** Fallbacks for an unknown key (a typo in a content file renders a tooth). */
export function DentalGlyph({ name, className = "h-6 w-6" }: { name?: DentalIcon | string; className?: string }) {
  const Icon = (name && MAP[name as DentalIcon]) || ToothIcon;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}

