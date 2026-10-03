import { MessageCircle } from "lucide-react";
import { useOutreach } from "@/admin/outreach/useOutreach";
import { cn } from "@/lib/utils";
import { waLink } from "../me/identity";
import { crm } from "../ui";

/**
 * Opens WhatsApp to Mehdi's own number (crm_me's hostWhatsapp) with `text`
 * typed (tellMehdi.ts: the person, the institute and the lead's CRM link, no
 * contact detail). A real link, so no popup blocker stops it.
 */
export function TellMehdiButton({ text, className, primary = false }: { text: string; className?: string; primary?: boolean }) {
  const { me } = useOutreach();
  const href = waLink(me.hostWhatsapp, text);
  if (!href) {
    return (
      <p className={cn("text-[12px] text-muted-foreground", className)} data-testid="tell-mehdi-none">
        Mehdi's WhatsApp number is not in the CRM yet: tell him another way.
      </p>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-testid="tell-mehdi" className={cn(primary ? crm.btnPrimary : crm.btn, "max-md:h-11", className)}>
      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Tell Mehdi on WhatsApp
    </a>
  );
}
