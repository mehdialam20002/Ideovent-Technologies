/**
 * The mobile action bar (under 1024px): Call, WhatsApp, Book, three equal
 * 64px targets, icon over a 12px label. Appears after 120px of scroll and
 * hides while the booking sheet is open. Each target is left out when its
 * number is missing; Book is always there.
 */

import { useEffect, useState } from "react";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { tr, trf } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { DENTAL_COPY, dentalContact, useBooking, whatsappHref } from "@/lib/demo/ui/dental";

export function ActionBar() {
  const { site, lang } = useSite();
  const { open, isOpen } = useBooking();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = () => setShown(window.scrollY > 120);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const c = dentalContact(site);
  const wa = whatsappHref(c.whatsapp, trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }));
  const cell = "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold";
  return (
    <nav aria-label={tr(DENTAL_COPY.book, lang)} className="dn-actionbar flex" data-shown={shown && !isOpen ? "" : undefined} aria-hidden={!shown || isOpen}>
      {c.tel && <a href={c.tel} className={cell} tabIndex={shown ? 0 : -1}><Phone className="h-5 w-5" aria-hidden="true" />{tr(DENTAL_COPY.call, lang)}</a>}
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${cell} text-[var(--dn-wa)]`} tabIndex={shown ? 0 : -1}><MessageCircle className="h-5 w-5" aria-hidden="true" />{tr(DENTAL_COPY.whatsapp, lang)}</a>}
      <button type="button" onClick={() => open()} className={`${cell} bg-[hsl(var(--ds-cta))] text-[hsl(var(--ds-on-cta))]`} tabIndex={shown ? 0 : -1}>
        <CalendarDays className="h-5 w-5" aria-hidden="true" />{tr(DENTAL_COPY.bookShort, lang)}
      </button>
    </nav>
  );
}
