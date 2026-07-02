import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { useContent } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { CtaButton } from "@/components/ui/cta-button";

export default function Footer() {
  const { navigation, contact, settings, socials } = useContent();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 border-t border-border bg-card/30">
      <div className="container-page section !pb-10">
        {/* CTA band */}
        <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-border bg-background p-8 md:p-14 bg-spotlight">
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h3 className="text-display font-display font-semibold">
                Let's build something <span className="accent-italic text-gradient">worth talking about.</span>
              </h3>
              <p className="mt-3 text-muted-foreground">{contact.responseTimePromise} Tell us about your project and we'll get back fast.</p>
            </div>
            <CtaButton cta={{ label: "Start a project", href: "/contact", variant: "primary" }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={settings.logo} alt="" className="h-11 w-auto object-contain dark:brightness-0 dark:invert" />
              <span className="font-display text-xl font-semibold">{settings.siteName}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{navigation.footer.tagline}</p>
            <div className="mt-6 flex gap-2.5">
              {socials.map((s) => {
                const Icon = getIcon(s.icon);
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={s.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {navigation.footer.columns.map((col) => (
            <div key={col.heading}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{col.heading}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link to={l.href} className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a href={contact.phoneHref} className="inline-flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-4 w-4 text-primary" /> {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={contact.emailHref} className="inline-flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4 text-primary" /> {contact.emailDisplay}
                </a>
              </li>
              <li className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {contact.address.line1}, {contact.address.city}, {contact.address.state} {contact.address.postalCode}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {year} {settings.siteName}. All rights reserved.</p>
          <p>Crafted with care in {contact.address.state}, {contact.address.country}.</p>
        </div>
      </div>
    </footer>
  );
}
