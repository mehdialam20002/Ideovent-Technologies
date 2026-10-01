/**
 * The 36px top bar in the brand colour: Open now chip and area on the left;
 * Emergency (red dot, number, tel:), Call, WhatsApp and Book on the right.
 * Phone: Emergency and the hours only (the action bar covers the rest).
 * It scrolls away; the header below it is the sticky part.
 */

import { MessageCircle, Phone } from "lucide-react";
import { bi, tr, trf } from "@/lib/demo/site/bilingual";
import { useSite } from "@/lib/demo/site/context";
import { DENTAL_COPY, OpenNowChip, dentalContact, useBooking, whatsappHref } from "@/lib/demo/ui/dental";

export function TopBar() {
  const { site, lang } = useSite();
  const { open } = useBooking();
  const c = dentalContact(site);
  const wa = whatsappHref(c.whatsapp, trf(DENTAL_COPY.waHello, lang, { clinic: site.instituteName }));
  const link = "inline-flex min-h-9 items-center gap-1.5 hover:underline";
  return (
    <div className="bg-[hsl(var(--ds-brand))] text-[13px] font-medium text-[hsl(var(--ds-on-brand))]">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 2xl:max-w-[1400px]">
        <div className="flex min-w-0 items-center gap-3">
          <OpenNowChip className="text-[13px]" />
          {/* The city in the reader's language (hi.city on the Hindi page), as
              every other page prints it; the English city when there is no
              Hindi one (1 Oct 2026). */}
          <span className="hidden truncate opacity-85 md:inline">{bi(site, "city", lang)}</span>
        </div>
        <div className="flex items-center gap-4">
          {c.emergencyTel && (
            <a href={c.emergencyTel} className={link}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--dn-emergency)] ring-2 ring-white/70" />
              <span>{tr(DENTAL_COPY.emergency, lang)}<span className="hidden sm:inline">: {c.emergencyPhone}</span></span>
            </a>
          )}
          {c.tel && <a href={c.tel} className={`${link} hidden lg:inline-flex`}><Phone className="h-3.5 w-3.5" aria-hidden="true" />{c.phone}</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${link} hidden lg:inline-flex`}><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{tr(DENTAL_COPY.whatsapp, lang)}</a>}
          <button type="button" onClick={() => open()} className={`${link} hidden lg:inline-flex`}>{tr(DENTAL_COPY.bookShort, lang)}</button>
        </div>
      </div>
    </div>
  );
}
