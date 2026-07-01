import { useState, type FormEvent } from "react";
import emailjs from "@emailjs/browser";
import { Mail, Phone, MapPin, Clock, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { useSingleton, useCms } from "@/lib/cms/context";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/Reveal";
import { nextId } from "@/lib/cms/store";
import { cn } from "@/lib/utils";

const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_xponvzu",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_v6zkm1n",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "zq5EixmXACyLZqpG7",
};

export default function ContactForm({ sourcePage = "contact" }: { sourcePage?: string }) {
  const contact = useSingleton("contact");
  const { actions } = useCms();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.message.trim()) e.message = "Message is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("sending");

    // Always capture the lead in the CMS so nothing is lost.
    try {
      await actions.saveDoc("submissions", {
        id: nextId("sub"),
        ...form,
        sourcePage,
        status: "new",
        receivedAt: new Date().toISOString(),
      } as any);
    } catch {
      /* non-fatal */
    }

    try {
      await emailjs.send(
        EMAILJS.serviceId,
        EMAILJS.templateId,
        { from_name: form.name, from_email: form.email, phone: form.phone, message: form.message },
        EMAILJS.publicKey
      );
    } catch {
      /* email optional — lead already captured */
    }
    setStatus("done");
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  const field = (name: keyof typeof form, label: string, placeholder: string, type = "text", required = false) => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {name === "message" ? (
        <textarea
          id={name}
          rows={4}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={placeholder}
          className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary", errors[name] ? "border-destructive" : "border-input")}
        />
      ) : (
        <input
          id={name}
          type={type}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          placeholder={placeholder}
          className={cn("w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary", errors[name] ? "border-destructive" : "border-input")}
        />
      )}
      {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <section id="contact" className="section">
      <div className="container-page grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Get in touch"
            title={<>Ready to <span className="accent-italic text-gradient">start</span> your project?</>}
            subtitle={`Fill out the form and our team will get back to you. ${contact.responseTimePromise}`}
          />
          <Reveal className="mt-10 space-y-4">
            {[
              { icon: Phone, label: "Call us", value: contact.phoneDisplay, href: contact.phoneHref },
              { icon: Mail, label: "Email us", value: contact.emailDisplay, href: contact.emailHref },
              { icon: MapPin, label: "Visit us", value: `${contact.address.line1}, ${contact.address.city}, ${contact.address.state} ${contact.address.postalCode}` },
              { icon: Clock, label: "Hours", value: contact.businessHours },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card/40 p-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <row.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</div>
                  {row.href ? (
                    <a href={row.href} className="font-medium hover:text-primary">{row.value}</a>
                  ) : (
                    <div className="font-medium">{row.value}</div>
                  )}
                </div>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="card-surface p-6 md:p-8">
            {status === "done" ? (
              <div className="flex h-full min-h-[24rem] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-14 w-14 text-primary" />
                <h3 className="mt-4 font-display text-2xl font-semibold">Thank you!</h3>
                <p className="mt-2 max-w-sm text-muted-foreground">Your message has been received. {contact.responseTimePromise}</p>
                <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-medium text-primary link-underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("name", "Name", "Your name", "text", true)}
                  {field("email", "Email", "you@email.com", "email", true)}
                </div>
                {field("phone", "Phone", "Your phone number", "tel")}
                {field("message", "Message", "How can we help you?", "text", true)}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-70"
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send message
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                {status === "error" && <p className="text-center text-sm text-destructive">Something went wrong. Please try again.</p>}
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
