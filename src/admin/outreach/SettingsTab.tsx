import { useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import type { OutreachSettings } from "@/lib/outreach/types";
import { DEFAULT_SIGNATURE } from "@/lib/outreach/store";
import { ZOHO_MAIL_DEFAULT, zohoMailOrigin } from "@/lib/outreach/mailLinks";
import { useOutreach } from "./useOutreach";
import { Field, btnPrimary, cardCls, inputCls, textareaCls } from "./ui";

/**
 * SETTINGS: the e-mail signature, the Zoho Mail address, an optional daily
 * WhatsApp limit (blank, the default, is no limit) and quiet hours, and
 * whether new demos are added to the CRM. Saved in the outreach store, not
 * the CMS.
 *
 * The "Gmail account for Open in Gmail" field is gone (28 Sep 2026). An old
 * saved value (senderGmail) is carried through a save untouched and read by
 * nothing, so old settings still load.
 *
 * ZOHO MAIL (2 Oct 2026). Open in Zoho Mail opens a new e-mail, filled in, at
 * the Zoho Mail address here (zohoMailUrl): https://mail.zoho.in, Zoho India,
 * where contact@ideovent.in is, unless another Zoho data centre is typed.
 * Anything that is not a Zoho Mail address is refused (mailLinks.ts
 * zohoMailOrigin) and Save stays off, as it does for a bad WhatsApp limit; the
 * box keeps its own text, so it can be cleared (blank saves the default). The
 * help line says both e-mail buttons: Zoho Mail in this browser, and the mail
 * app, the computer's default e-mail app, which can be Gmail or Zoho Mail in
 * Chrome if Chrome is set to handle e-mail links.
 *
 * DEMO-OPEN E-MAILS ARE GONE (1 Oct 2026, Mehdi: "mai demo opened wala mail
 * nhi chahta"). src/lib/demo/opens.ts no longer sends one, so the "Alert me
 * when a lead opens their demo" switch and the alert e-mail box are out of
 * this form, and so is the write to the CMS settings.demoOpenAlerts flag.
 * Old saved values (alertOnDemoOpen, alertEmail) ride through a save
 * untouched and nothing acts on them. One line in "Demos and the CRM" says
 * where opens still show.
 */
export function SettingsTab() {
  const { settings, saveSettings } = useOutreach();
  const [form, setForm] = useState<OutreachSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setForm(settings), [settings]);
  const set = <K extends keyof OutreachSettings>(k: K, v: OutreachSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  /* The limit box is text so it can be blank; blank means no limit. */
  const [limitText, setLimitText] = useState(settings.whatsappDailyLimit ? String(settings.whatsappDailyLimit) : "");
  useEffect(() => setLimitText(settings.whatsappDailyLimit ? String(settings.whatsappDailyLimit) : ""), [settings.whatsappDailyLimit]);
  const limitNum = limitText.trim() === "" ? 0 : Number(limitText.trim());
  const capOk = Number.isInteger(limitNum) && limitNum >= 0 && limitNum <= 10000;

  /* The Zoho Mail box is text of its own, so it can be cleared; blank means Zoho India, the default. */
  const [zohoText, setZohoText] = useState(settings.zohoMailUrl || ZOHO_MAIL_DEFAULT);
  useEffect(() => setZohoText(settings.zohoMailUrl || ZOHO_MAIL_DEFAULT), [settings.zohoMailUrl]);
  const zohoOk = zohoMailOrigin(zohoText) !== "";

  const save = async () => {
    setErr(null);
    try {
      await saveSettings({ ...form, whatsappDailyLimit: limitNum > 0 ? limitNum : 0, zohoMailUrl: zohoMailOrigin(zohoText) });
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
        if (capOk && zohoOk) void save();
      }}
    >
      <section className={cardCls + " space-y-4"}>
        <h2 className="font-display text-lg font-semibold">Sender</h2>
        <p className="text-xs text-muted-foreground" data-testid="mail-app-help">
          Open in Zoho Mail opens a new e-mail in Zoho Mail in this browser, filled in: stay signed in to Zoho there. Open in
          mail app uses this computer's default e-mail app; to use Gmail or Zoho Mail in the browser for it, set it as
          Chrome's default for e-mail links.
        </p>
        <Field id="set-sig" label="Email signature" hint="Added under every email: your real name, company, city and phone.">
          <textarea id="set-sig" rows={5} className={textareaCls} value={form.signature} onChange={(e) => set("signature", e.target.value)} />
        </Field>
        <button type="button" className="text-xs text-primary underline underline-offset-2" onClick={() => set("signature", DEFAULT_SIGNATURE)}>
          Use the default signature
        </button>
        <Field id="set-zoho" label="Zoho Mail address" hint="Open in Zoho Mail opens a new e-mail here, filled in. https://mail.zoho.in is Zoho India, where contact@ideovent.in is.">
          <input id="set-zoho" data-testid="set-zoho" type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder={ZOHO_MAIL_DEFAULT}
            className={inputCls} value={zohoText} onChange={(e) => { setSaved(false); setZohoText(e.target.value); }} />
        </Field>
        {!zohoOk && <p className="text-xs text-destructive" data-testid="set-zoho-error">Type a Zoho Mail address such as https://mail.zoho.in.</p>}
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

      <section className={cardCls + " space-y-3"}>
        <h2 className="font-display text-lg font-semibold">Demos and the CRM</h2>
        <p className="text-sm" data-testid="demo-open-note">
          No e-mail is sent when a demo is opened. Opens still show in the CRM, under Hot on Today and on the lead's demo card.
        </p>
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
        <button type="submit" className={btnPrimary} disabled={!capOk || !zohoOk}>
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
