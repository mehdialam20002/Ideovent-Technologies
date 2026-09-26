import { Trash2, Mail, Phone, Inbox, MessageCircle, MapPin, Building2, CalendarClock, Wallet } from "lucide-react";
import { useCollection, useCms } from "@/lib/cms/context";
import type { ContactSubmission } from "@/lib/cms/types";
import { normalisePhone, whatsappToLead } from "@/lib/leads";
import { cn } from "@/lib/utils";

/*
  CONTACT LEADS.

  Every enquiry from the contact form and from the pop-up lands here (in live
  mode; in local mode only the ones sent from this browser do, see
  src/lib/leads.ts). The first thing on each card is the one Mehdi acts on:
  "Reply on WhatsApp", which opens a chat with the lead with a first line that
  names what they asked for, so the reply starts from their question rather
  than from "Hi, you contacted us".

  The pop-up sends in two steps: the need, name and number first, then,
  optionally, the rest. The second step is a separate row that points at the
  first through `followUpOf` (an anonymous visitor may insert rows but never
  update one). They are shown here as ONE lead, with the later details folded
  in, so the same person never appears twice.
*/

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");

function phoneLinks(s: ContactSubmission) {
  // Older rows have only the phone as typed. Normalise it here so they get a
  // WhatsApp link too.
  const n = normalisePhone(s.phone || "");
  const e164 = s.phoneE164 || (n.ok ? n.e164 : "");
  const whatsapp = s.whatsapp ?? (n.ok ? n.whatsapp : "");
  return { tel: e164 ? `tel:${e164}` : s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : "", whatsapp };
}

export default function AdminSubmissions() {
  const all = [...useCollection("submissions")].sort((a, b) => (b.receivedAt || "").localeCompare(a.receivedAt || ""));
  const { actions } = useCms();

  const byId = new Map(all.map((s) => [s.id, s]));
  const followUps = new Map<string, ContactSubmission[]>();
  for (const s of all) {
    if (s.followUpOf && byId.has(s.followUpOf)) {
      followUps.set(s.followUpOf, [...(followUps.get(s.followUpOf) || []), s]);
    }
  }
  const leads = all.filter((s) => !(s.followUpOf && byId.has(s.followUpOf)));
  const unread = leads.filter((s) => s.status === "new").length;

  const markRead = (s: ContactSubmission) =>
    Promise.all([s, ...(followUps.get(s.id) || [])].map((d) => actions.saveDoc("submissions", { ...d, status: "read" })));
  const remove = async (s: ContactSubmission) => {
    if (!confirm(`Delete the enquiry from ${s.name || "this visitor"}?`)) return;
    for (const d of [s, ...(followUps.get(s.id) || [])]) await actions.removeDoc("submissions", d.id);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Inbox className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Contact leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} total{unread ? `, ${unread} new` : ""}
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No enquiries yet.</div>
      ) : (
        <div className="grid gap-3">
          {leads.map((s) => {
            const later = followUps.get(s.id) || [];
            // Fold the optional second step into the lead: its values win
            // where the first row had none.
            const m: ContactSubmission = later.reduce<ContactSubmission>(
              (acc, f) => ({
                ...acc,
                name: acc.name || f.name,
                organisation: f.organisation || acc.organisation,
                city: f.city || acc.city,
                timeline: f.timeline || acc.timeline,
                budget: f.budget || acc.budget,
                email: f.email || acc.email,
                message: [acc.message, f.message].filter(Boolean).join("\n\n"),
              }),
              s,
            );
            const { tel, whatsapp } = phoneLinks(s);
            const wa = whatsappToLead({ name: s.name, need: s.need, whatsapp });
            const isNew = s.status === "new" || later.some((f) => f.status === "new");
            const details = [
              { icon: Building2, label: "Website to check", value: m.website },
              { icon: Building2, label: "Institute or business", value: m.organisation },
              { icon: MapPin, label: "City", value: m.city },
              { icon: CalendarClock, label: "Wants to start", value: m.timeline },
              { icon: Wallet, label: "Budget", value: m.budget },
            ].filter((d) => d.value);

            return (
              <article key={s.id} className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{m.name || s.website || "(no name)"}</h2>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", isNew ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                        {isNew ? "new" : s.status}
                      </span>
                      {s.need && <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-xs font-medium text-foreground">{s.need}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {when(s.receivedAt)} · {s.source === "popup" ? "pop-up" : s.source === "contact-form" ? "contact form" : s.sourcePage}
                      {s.page ? ` on ${s.page}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isNew && (
                      <button onClick={() => markRead(s)} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/50">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => remove(s)} aria-label={`Delete the enquiry from ${s.name}`} className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <MessageCircle className="h-4 w-4" /> Reply on WhatsApp
                    </a>
                  ) : (
                    s.phone && <span className="text-xs text-muted-foreground">Landline or unrecognised number: call instead.</span>
                  )}
                  {s.phone && (
                    <a href={tel} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {s.phone}
                    </a>
                  )}
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <Mail className="h-3.5 w-3.5" /> {m.email}
                    </a>
                  )}
                </div>

                {details.length > 0 && (
                  <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                    {details.map((d) => (
                      <div key={d.label} className="flex items-baseline gap-2">
                        <dt className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
                          <d.icon className="h-3.5 w-3.5 self-center" /> {d.label}:
                        </dt>
                        <dd className="min-w-0">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {m.message && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm">{m.message}</p>}
                {later.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Details added from the pop-up's second step, {when(later[0].receivedAt)}.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
