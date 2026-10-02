import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { crm } from "../ui";
import { CopyValue, MakeOne, META_RELAY_URL } from "./metaUi";

/** The request content Make sends: each <...> is the matching item clicked in from the Facebook Lead Ads module (spec 8, step 21). */
export const RELAY_BODY = `{
  "leadgen_id": "<Lead ID>",
  "created_time": "<Created time>",
  "platform": "<Platform>",
  "form_id": "<Form ID>",
  "form_name": "<Form name>",
  "campaign_name": "<Campaign name>",
  "ad_name": "<Ad name>",
  "answers": {
    "full_name": "<Full name>",
    "phone_number": "<Phone number>",
    "email": "<Email>",
    "company_name": "<Business name>",
    "city": "<City>",
    "business_type": "<Business type>"
  }
}`;

/**
 * Section 5 of the Meta page, collapsed: the Make.com fallback, only if Meta
 * blocks the app (meta-leads-spec 4.8 and step 21). Make holds lead data
 * abroad, so it stays the fallback, behind its own secret.
 */
export function MetaRelayHelp() {
  return (
    <details data-testid="meta-relay" className={cn(crm.panel, "group")}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[13px] font-medium sm:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
        If Meta blocks the app: Make
      </summary>
      <div className="space-y-2 border-t border-border px-4 py-3 text-[13px] leading-snug sm:px-5">
        <p className="text-muted-foreground">
          Only if Publish is refused, real leads fail with a permission error, System users is missing, or Meta asks for App Review.
          Make then sits between Meta and the CRM, so go back to the app once Meta allows it.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>make.com, Free plan. New scenario: Facebook Lead Ads &gt; New Lead (the instant one, not Watch Leads), signed in as yourself, your Page and form.</li>
          <li>
            Then HTTP &gt; Make a request. URL <CopyValue value={META_RELAY_URL} label="the relay URL" />, method POST, header{" "}
            <CopyValue value="X-Ideovent-Relay" label="the header name" /> set to a new secret:
            <MakeOne name="META_RELAY_SECRET" where="in Vercel and in Make" />
          </li>
          <li>
            Body type Raw, content type JSON, request content (click each &lt;...&gt; in from the Lead Ads module):
            <pre className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-muted p-2.5 text-[12px] leading-snug">{RELAY_BODY}</pre>
          </li>
          <li>Vercel: META_RELAY_SECRET, the same secret, ticked Sensitive. Redeploy, then press Connect above.</li>
          <li>Business settings &gt; Leads access &gt; CRMs: assign Make. Then send one lead from the Lead Ads Testing Tool.</li>
        </ol>
      </div>
    </details>
  );
}
