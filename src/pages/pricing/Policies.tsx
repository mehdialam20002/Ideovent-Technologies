import { Link } from "react-router-dom";
import { useSingleton } from "@/lib/cms/context";
import { GST_LINE } from "@/lib/pricing";
import { unbreakable } from "@/lib/typography";
import { DELIVERY } from "./copy";
import { SectionHead } from "./ui";

/**
 * WHO YOU PAY, THE POLICIES, AND DELIVERY. Razorpay checks a site before it
 * issues live keys: prices in rupees with nothing hidden, the business's name,
 * address and phone, and links to the terms, privacy, refund and cancellation,
 * and shipping (for a service business, delivery) policies. All of it is on
 * this page, next to the prices. The street address and PIN are not confirmed
 * (FACTS.md: "Saket, New Delhi, India"), so none is printed; e-mail is left to
 * /contact because no mailbox exists on ideovent.in yet (FACTS.md, 30 Sep 2026).
 */
const POLICIES = [
  { to: "/terms", label: "Terms and conditions" },
  { to: "/refund", label: "Refund and cancellation policy" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact us" },
  { to: "/about", label: "About us" },
];

export default function Policies() {
  const contact = useSingleton("contact");
  const a = contact.address;
  const address = [a?.line1, a?.city, a?.country].filter(Boolean).join(", ");

  return (
    <section id="policies" className="section-tight" aria-labelledby="policies-heading">
      <div className="container-page">
        <SectionHead id="policies-heading" title="Who you pay, how it is delivered, and the policies" />

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card/60 p-6">
            <h3 className="font-display text-lg font-semibold">Who you are paying</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Business</dt>
                <dd className="text-foreground">Ideovent Technologies, a partnership firm of Mehdi Alam and Abhishek Tiwari</dd>
              </div>
              {address && (
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="text-foreground">{address}</dd>
                </div>
              )}
              {contact.phoneHref && (
                <div>
                  <dt className="text-muted-foreground">Phone and WhatsApp</dt>
                  <dd>
                    <a href={contact.phoneHref} className="text-foreground underline underline-offset-2 hover:text-primary">
                      {unbreakable(contact.phoneDisplay)}
                    </a>
                  </dd>
                </div>
              )}
              {contact.businessHours && (
                <div>
                  <dt className="text-muted-foreground">Working hours</dt>
                  <dd className="text-foreground">{contact.businessHours}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="text-foreground">{GST_LINE}</dd>
              </div>
            </dl>
          </div>

          <div id="delivery" className="rounded-3xl border border-border bg-card/60 p-6">
            <h3 className="font-display text-lg font-semibold">How you receive what you pay for</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-border">
              {DELIVERY.map((d) => (
                <li key={d} className="text-pretty">{d}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card/60 p-6">
            <h3 className="font-display text-lg font-semibold">Policies</h3>
            <ul className="mt-3">
              {POLICIES.map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
