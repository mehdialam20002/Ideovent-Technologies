import { BadgeCheck, MessageCircle, Smartphone } from "lucide-react";
import { prettyPhone } from "@/admin/outreach/ui";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { crm } from "../ui";
import { phoneTestText, waLink } from "./identity";

const STEPS = [
  <>
    <b>Settings &gt; Apps &gt; WhatsApp Business &gt; Open by default &gt; Open supported links &gt; Always allow.</b> Then{" "}
    <b>Settings &gt; Apps &gt; WhatsApp &gt; Open by default &gt; Don't allow.</b> Otherwise the CRM's WhatsApp button
    opens your personal WhatsApp first.
  </>,
  <>
    Install <b>Zoho Mail</b>, sign in to your <b>@ideovent.in</b> mailbox and make it the default mail app. Zoho Mail Free
    has no IMAP or POP, so no other mail app can send from that mailbox.
  </>,
  <>
    In WhatsApp Business: <b>Settings &gt; Chats &gt; Chat backup &gt; Back up to Google Account: Never</b>, so company
    chats stay out of your personal Google account.
  </>,
  <>
    On a laptop, link <b>WhatsApp Web</b> to the company number (WhatsApp Business &gt; <b>Linked devices</b>).
  </>,
];

/**
 * SET UP THIS PHONE (spec 5.2 step 4, 10.5; the intern guide, section 1).
 *
 * The CRM only opens wa.me, mailto: and Zoho Mail's compose page, so the phone decides which
 * account sends. These steps make it the company's WhatsApp Business and
 * the @ideovent.in mailbox. Then "Send a test to Mehdi" opens WhatsApp to his
 * number (crm_me's hostWhatsapp) with the test typed; when it arrives from the
 * company number he ticks Number checked on the Team page, and WhatsApp sends
 * open up.
 *
 * My day shows the card until the number is checked, then one line of small
 * print ("Sends from WhatsApp Business, +91 ..."). `always` (the Me page)
 * shows the whole card whatever the state.
 */
export function PhoneSetup({ always = false, className }: { always?: boolean; className?: string }) {
  const { me } = useCrmMe();
  const phone = me.senderPhone ? prettyPhone(me.senderPhone) : "";
  if (!always && me.senderChecked) {
    return phone ? (
      <p data-testid="phone-setup-done" className={cn("text-[12px] text-muted-foreground", className)}>
        Sends from WhatsApp Business, {phone}
      </p>
    ) : null;
  }
  const name = me.senderName || me.displayName || "the team";
  const href = waLink(me.hostWhatsapp, phoneTestText(name));
  const owner = me.role === "owner";
  return (
    <section data-testid="phone-setup" aria-labelledby="phone-setup-title" className={cn(crm.panel, crm.panelPad, className)}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="phone-setup-title" className="text-[15px] font-semibold">Set up this phone</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {owner
              ? "Once, on the phone you send from, before any WhatsApp message. The steps are for Android."
              : "Once, on the phone with the company SIM, before any WhatsApp message. The steps are for Android: on an iPhone, tell Mehdi before you start."}
          </p>
        </div>
      </div>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed marker:text-muted-foreground">
        {STEPS.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
        {!owner && (
          <li>
            <b>Send a test to Mehdi.</b> When it reaches him from your company number, he ticks <b>Number checked</b>. Until
            then WhatsApp sends stay blocked; e-mail works.
          </li>
        )}
      </ol>
      {owner ? (
        /* Mehdi's own page (crm-fixes-1004 item 17): nothing tells him to test with, or ask, himself. */
        <div className="mt-4 space-y-1.5" data-testid="phone-setup-owner">
          <PhoneState checked={me.senderChecked} phone={phone} owner />
          <p className="text-[12px] text-muted-foreground" data-testid="phone-setup-host">
            {me.hostWhatsapp
              ? `Team members send their phone test to ${prettyPhone(me.hostWhatsapp)}, the number on your own row in Team > People.`
              : "Team members send their phone test to the number on your own row in Team > People. Add your WhatsApp number there before the first person sets up a phone."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {href ? (
              <a data-testid="phone-setup-test" href={href} target="_blank" rel="noopener noreferrer" className={crm.btnPrimary}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send a test to Mehdi
              </a>
            ) : (
              <button type="button" disabled data-testid="phone-setup-test" className={crm.btnPrimary}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send a test to Mehdi
              </button>
            )}
            <PhoneState checked={me.senderChecked} phone={phone} owner={false} />
          </div>
          {!href && <p className="mt-2 text-[12px] text-muted-foreground">Mehdi has not added his own number to the CRM yet. Ask him.</p>}
        </>
      )}
    </section>
  );
}

function PhoneState({ checked, phone, owner }: { checked: boolean; phone: string; owner: boolean }) {
  if (checked) {
    return (
      <p data-testid="phone-setup-state" className="inline-flex items-center gap-1.5 text-[13px] text-success">
        <BadgeCheck className="h-4 w-4" aria-hidden="true" />
        {owner ? "Your own number counts as checked." : `Number checked${phone ? `: ${phone}` : ""}.`}
      </p>
    );
  }
  return (
    <p data-testid="phone-setup-state" className="text-[13px] text-muted-foreground">
      {phone ? `Waiting for Mehdi to tick Number checked for ${phone}.` : "Mehdi has not set your company number yet."}
    </p>
  );
}
