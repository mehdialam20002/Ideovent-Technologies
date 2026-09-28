import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import type { OutreachSettings } from "@/lib/outreach/types";
import { DEFAULT_SIGNATURE } from "@/lib/outreach/store";
import { useCms } from "@/lib/cms/context";
import { useOutreach } from "./useOutreach";
import { Field, btnPrimary, cardCls, inputCls, textareaCls } from "./ui";

/**
 * SETTINGS: which Google account Gmail opens in, the signature, an optional
 * daily WhatsApp limit (blank, the default, is no limit) and quiet hours,
 * demo-open alerts, and whether new demos are added to the CRM. Saved in the
 * outreach store, not the CMS.
 */
export function SettingsTab() {
  const { settings, saveSettings } = useOutreach();
  const { data, actions } = useCms();
  /* The alert itself is sent by the PUBLIC demo page (src/lib/demo/opens.ts),
     which runs as anon and can only read the public CMS settings, so the
     switch that really matters is settings.demoOpenAlerts. Both are written. */
  const cmsAlerts = data.settings?.demoOpenAlerts !== false;
  const withCms = (s: OutreachSettings): OutreachSettings => ({ ...s, alertOnDemoOpen: cmsAlerts });
  const [form, setForm] = useState<OutreachSettings>(withCms(settings));
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(withCms(settings)), [settings, cmsAlerts]);
  const set = <K extends keyof OutreachSettings>(k: K, v: OutreachSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  /* The limit box is text so it can be blank; blank means no limit. */
  const [limitText, setLimitText] = useState(settings.whatsappDailyLimit ? String(settings.whatsappDailyLimit) : "");
  useEffect(() => setLimitText(settings.whatsappDailyLimit ? String(settings.whatsappDailyLimit) : ""), [settings.whatsappDailyLimit]);
  const limitNum = limitText.trim() === "" ? 0 : Number(limitText.trim());
  const capOk = Number.isInteger(limitNum) && limitNum >= 0 && limitNum <= 10000;
  const gmailOk = !form.senderGmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.senderGmail.trim()) || /^\d$/.test(form.senderGmail.trim());

  const save = async () => {
    setErr(null);
    try {
      await saveSettings({ ...form, whatsappDailyLimit: limitNum > 0 ? limitNum : 0, senderGmail: (form.senderGmail || "").trim(), alertEmail: (form.alertEmail || "").trim() });
      if (data.settings && (data.settings.demoOpenAlerts !== false) !== form.alertOnDemoOpen) {
        await actions.saveSingleton("settings", { ...data.settings, demoOpenAlerts: form.alertOnDemoOpen });
      }
      setSaved(true);
    } catch (e) {
      setErr("Not saved: " + ((e as Error).message || "unknown error"));
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (capOk && gmailOk) void save();
      }}
    >
      <section className={cardCls + " space-y-4"}>
        <h2 className="font-display text-lg font-semibold">Sender</h2>
        <Field
          id="set-gmail"
          label="Gmail account for Open in Gmail"
          hint="The Google account the compose window opens in, e.g. mehdi@ideovent.in. Leave empty to use whichever account the browser opens first. The account must be signed in on this browser."
        >
          <input id="set-gmail" type="email" inputMode="email" autoComplete="email" className={inputCls} value={form.senderGmail || ""} onChange={(e) => set("senderGmail", e.target.value)} placeholder="you@gmail.com" />
        </Field>
        {!gmailOk && <p className="text-xs text-destructive">That does not look like an email address.</p>}
        <Field id="set-sig" label="Email signature" hint="Added under every email: your real name, company, city and phone.">
          <textarea id="set-sig" rows={5} className={textareaCls} value={form.signature} onChange={(e) => set("signature", e.target.value)} />
        </Field>
        <button type="button" className="text-xs text-primary underline underline-offset-2" onClick={() => set("signature", DEFAULT_SIGNATURE)}>
          Use the default signature
        </button>
      </section>

      <section className={cardCls + " space-y-4"}>
        <h2 className="font-display text-lg font-semibold">WhatsApp and quiet hours</h2>
        <Field id="set-cap" label="Daily WhatsApp limit, blank for no limit" hint="Leave it blank to send as many WhatsApp messages as you like. Type a number only if you want the first-message buttons to stop at that many a day.">
          <input id="set-cap" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="No limit" className={inputCls + " max-w-[10rem]"} value={limitText} onChange={(e) => { setSaved(false); setLimitText(e.target.value); }} />
        </Field>
        {!capOk && <p className="text-xs text-destructive">Type a whole number, or leave it blank for no limit.</p>}
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Field id="set-qs" label="Quiet from">
            <input id="set-qs" type="time" className={inputCls} value={form.quietStart} onChange={(e) => set("quietStart", e.target.value)} />
          </Field>
          <Field id="set-qe" label="Quiet until">
            <input id="set-qe" type="time" className={inputCls} value={form.quietEnd} onChange={(e) => set("quietEnd", e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Sending inside quiet hours shows a warning. It does not block.</p>
      </section>

      <section className={cardCls + " space-y-4"}>
        <h2 className="font-display text-lg font-semibold">Demo-open alerts</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" checked={form.alertOnDemoOpen} onChange={(e) => set("alertOnDemoOpen", e.target.checked)} />
          Alert me when a lead opens their demo
        </label>
        <p className="text-xs text-muted-foreground">
          When a sent demo is opened, an email titled "Demo opened: institute name" goes to the enquiry inbox the contact form
          uses (EmailJS), at most once per demo per browser per day, and never for your own opens. Opens also show under
          Today as Hot, whether or not this is on.
        </p>
        <Field id="set-alert" label="Your alert email (for reference)" hint="Kept with your settings. Delivery goes to the EmailJS enquiry inbox; change that inbox in EmailJS if it should be a different address.">
          <input id="set-alert" type="email" inputMode="email" className={inputCls} value={form.alertEmail || ""} onChange={(e) => set("alertEmail", e.target.value)} placeholder="you@gmail.com" disabled={!form.alertOnDemoOpen} />
        </Field>
      </section>

      <section className={cardCls + " space-y-3"}>
        <h2 className="font-display text-lg font-semibold">Demos and the CRM</h2>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5" data-testid="set-auto-demos" checked={form.autoAddDemos !== false} onChange={(e) => set("autoAddDemos", e.target.checked)} />
          Add every new demo to the CRM
        </label>
        <p className="text-xs text-muted-foreground">
          When you make a demo from a template or a poster, a lead is added for it with the demo linked, so you can track who
          opened it. If a lead with the same name and city, or the same phone or email, already exists, the demo is linked to
          that lead instead. The poster screen has its own switch for each demo.
        </p>
      </section>

      {err && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={!capOk || !gmailOk}>
          <Save className="h-4 w-4" aria-hidden="true" /> Save settings
        </button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" aria-hidden="true" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
