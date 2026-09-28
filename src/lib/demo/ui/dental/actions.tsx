/**
 * THE THREE ACTIONS: Book (the one primary), WhatsApp and Call (the two
 * direct lines). Repeated in the top bar, under every hero, at the end of
 * every treatment page and in the mobile action bar (DENTAL-IA.md section 3).
 * Each renders nothing when its number is missing (a fresh duplicate).
 */

import type { ReactNode } from "react";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { tr, trf } from "@/lib/demo/site/bilingual";
import type { DemoLang } from "@/lib/demo/language";
import { useSite } from "@/lib/demo/site/context";
import { useBooking } from "./booking";
import { DENTAL_COPY } from "./copy";
import { clock12, dentalContact, dentalOf, openStatus, whatsappHref, type BookingPreset, type OpenStatus } from "./logic";

export type ActionSize = "md" | "lg";

const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--dn-btn-radius,var(--ds-radius))] px-5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/** Opens the booking sheet. `preset` pre-fills step 1 and skips to step 2. */
export function BookButton({ preset, children, size = "md", tone = "cta", className = "" }: {
  preset?: BookingPreset;
  children?: ReactNode;
  size?: ActionSize;
  /** cta: the theme's action colour. hero: calm heroes' sand fill. ghost: outline. */
  tone?: "cta" | "hero" | "ghost";
  className?: string;
}) {
  const { lang } = useSite();
  const { open } = useBooking();
  return (
    <button type="button" onClick={() => open(preset)} data-tone={tone}
      className={`${base} dn-book ${size === "lg" ? "min-h-[52px] text-base" : "text-sm"} ${className}`}>
      <CalendarDays className="h-4 w-4" aria-hidden="true" />
      {children || tr(DENTAL_COPY.book, lang)}
    </button>
  );
}

/** WhatsApp with a prefilled message. Green #0B7A3E, white label. */
export function WhatsAppButton({ text, children, size = "md", variant = "solid", className = "" }: {
  text?: string;
  children?: ReactNode;
  size?: ActionSize;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const { site, lang } = useSite();
  const href = whatsappHref(dentalContact(site).whatsapp, text || trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }));
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-variant={variant}
      className={`${base} dn-wa ${size === "lg" ? "min-h-[52px] text-base" : "text-sm"} ${className}`}>
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {children || tr(DENTAL_COPY.whatsappNow, lang)}
    </a>
  );
}

/** Call, with the number written out (never hidden behind "Call us"). */
export function CallLink({ emergency, className = "", showNumber = true }: { emergency?: boolean; className?: string; showNumber?: boolean }) {
  const { site, lang } = useSite();
  const c = dentalContact(site);
  const href = emergency ? c.emergencyTel : c.tel;
  const number = emergency ? c.emergencyPhone : c.phone;
  if (!href) return null;
  return (
    <a href={href} className={`inline-flex min-h-11 items-center gap-2 font-semibold ${className}`}>
      <Phone className="h-4 w-4" aria-hidden="true" />
      {showNumber ? number : tr(emergency ? DENTAL_COPY.emergency : DENTAL_COPY.call, lang)}
    </a>
  );
}

/** Book + WhatsApp + Call, the hero and band trio. */
export function ActionButtons({ size = "lg", heroTone = false, className = "" }: { size?: ActionSize; heroTone?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      <BookButton size={size} tone={heroTone ? "hero" : "cta"} />
      <WhatsAppButton size={size} variant="outline" />
      <CallLink />
    </div>
  );
}

const DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

/** "Open now" / "Opens 5 pm" / "Opens tomorrow, 10 am" / "Opens Tue, 10 am". */
export function openLabel(s: OpenStatus, lang: DemoLang): string {
  if (s.state === "open") return tr(DENTAL_COPY.openNow, lang);
  if (s.state === "later") return trf(DENTAL_COPY.opensAt, lang, { time: clock12(s.opensAt!) });
  if (s.opensAt && s.nextDay !== undefined) {
    const time = clock12(s.opensAt);
    if (s.daysAhead === 1) return trf(DENTAL_COPY.opensTomorrow, lang, { time });
    return trf(DENTAL_COPY.opensOn, lang, { time, day: (lang === "hi" ? DAY_HI : DAY_EN)[s.nextDay] });
  }
  return tr(DENTAL_COPY.closedToday, lang);
}

/** The open state with its dot. Nothing without sessions. */
export function OpenNowChip({ className = "" }: { className?: string }) {
  const { site, lang } = useSite();
  const s = openStatus(dentalOf(site).sessions);
  if (!s) return null;
  const text = openLabel(s, lang);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`} data-state={s.state}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.state === "open" ? "bg-emerald-500" : "bg-amber-500"}`} />
      {text}
    </span>
  );
}
