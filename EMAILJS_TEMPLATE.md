# EmailJS template for enquiries

Every enquiry from the contact form and from the pop-up is sent by `submitLead()` in
`src/lib/leads.ts`, and every internship application from /internship by
`submitApplication()` in the same file, through the same template (see "Internship
applications" below). This file lists the variables it sends and gives the template body to
paste into EmailJS, so the e-mail shows each field on its own line instead of one block.

Service `service_q5dptxe`, template `template_v6zkm1n`, public key `zq5EixmXACyLZqpG7`.
These are the defaults in `src/lib/leads.ts`. The `VITE_EMAILJS_SERVICE_ID`,
`VITE_EMAILJS_TEMPLATE_ID` and `VITE_EMAILJS_PUBLIC_KEY` environment variables override them.

## First: reconnect Gmail

Since 25 September 2026 every send fails with **412 "Gmail_API: Invalid grant"**. That
means EmailJS lost permission to send through the Gmail account. Until it is fixed, no
enquiry reaches you by e-mail. The site tells each visitor that their message did not
send and gives them the WhatsApp link, so nobody sees a thank-you that is not true. It
also means you get no enquiries by e-mail until you fix it.

1. Sign in at https://dashboard.emailjs.com and open **Email Services**.
2. Open the Gmail service (`service_q5dptxe`). Press **Disconnect**, then **Connect
   account**. Sign in with the Gmail account that should send the enquiries and allow
   every permission it asks for.
3. Press **Save**. On the template page, use **Test it** to send one test e-mail to
   yourself.
4. Then send a real enquiry from https://ideovent.vercel.app/contact. You should see the
   thank-you, not the red "did not send" box.

## The variables

Each field is sent as a template variable. Empty fields are sent as empty strings, so
`{{city}}` prints nothing when the visitor gave no city.

| Variable | What it holds | Example |
|---|---|---|
| `website` | Their website address, or their business name if they have none (required, the first field on both forms) | menonclinic.in |
| `from_name` | Their name. Optional on the forms: when they leave it empty this holds the website instead | Kavita Menon |
| `phone` | Phone, normalised (required) | +91 98765 43210 |
| `need` | What they run (required): Shop or restaurant, Clinic or salon, Gym or fitness, Office or firm (law, CA, real estate), School or coaching, Startup or app idea, Something else. Enquiries sent before 26 Sep 2026 carry the old labels (School, Coaching institute, Business, App or custom software) | Clinic or salon |
| `organisation` | Business or organisation | Menon Dental Clinic |
| `city` | City | Patna |
| `timeline` | When they want to start | In 1 to 3 months |
| `budget` | Budget range, from the canonical table | ₹20,000-₹45,000 (website) |
| `from_email` | Their email (optional now) | kavita@example.org |
| `reply_to` | Same as `from_email`, for the Reply-To header | kavita@example.org |
| `visitor_message` | Only what they typed in the message box | Our prices are only in a PDF. |
| `message` | Everything above as plain text, their message first | (see below) |
| `source` | Which form | Pop-up, Contact form, or Internship form |
| `page` | The page they were on | /work/gym-map |
| `whatsapp_link` | One tap to reply on WhatsApp, first line already written | https://wa.me/919876543210?text=Hello%20Kavita... |
| `received_at` | Time sent, ISO format | 2026-09-26T10:42:07.113Z |
| `submission_id` | The id of the record: sub_... in /admin/submissions, app_... in /admin/applications | sub_mfz2k1_0_1x9a |
| `follow_up_of` | Set when this adds details to an enquiry sent a moment before (the pop-up's optional second step) | sub_mfz2k1_0_1x9a |

**`message` keeps the template you have now working.** Your current template prints only
`{{from_name}}`, `{{from_email}}`, `{{phone}}` and `{{message}}`. So `message` carries the
whole enquiry as text: their own words first, then every field and the WhatsApp reply link.
You see everything even before you paste the new body. After you paste it, `message` is
no longer used.

## The template to paste

In EmailJS, open **Email Templates**, then `template_v6zkm1n`.

**Subject**

```
{{need}} enquiry: {{website}}
```

**Reply To** field: `{{reply_to}}`. It is empty when they gave no email.
Reply on WhatsApp in that case.

**Content** (switch the editor to plain text or code view, then paste)

```
New enquiry from the {{source}} on {{page}}

Reply on WhatsApp: {{whatsapp_link}}

Website:     {{website}}
Name:        {{from_name}}
Phone:       {{phone}}
Needs:       {{need}}
Business:    {{organisation}}
City:        {{city}}
Start:       {{timeline}}
Budget:      {{budget}}
Email:       {{from_email}}

Message:
{{visitor_message}}

{{#follow_up_of}}This adds details to enquiry {{follow_up_of}}, sent a moment earlier.{{/follow_up_of}}
Received {{received_at}} · record {{submission_id}}
```

`{{#field}} ... {{/field}}` is an EmailJS conditional section: the text between the two
tags prints only when the field has a value (EmailJS docs, "Dynamic variables in
templates"). Any other field that is empty prints as nothing, which leaves an empty
label line. That does no harm.

## Internship applications

The LaunchPad form on /internship sends through the same service and the same template,
with the same variables, filled like this:

| Variable | For an application |
|---|---|
| `need` | Always `Internship application` |
| `website` | The applicant and their college, so the subject names them: `Asha Verma, Delhi Technological University` |
| `from_name`, `from_email`, `reply_to`, `phone` | The applicant's name, email, phone. Email is required on this form, so Reply works |
| `organisation` | Their college or institute |
| `city`, `timeline`, `budget`, `follow_up_of` | Empty |
| `visitor_message` and `message` | The whole application: programme, name, email, phone, college, stream, the links found in their notes, the WhatsApp reply link, then their notes in their own words |
| `source` | `Internship form` |
| `submission_id` | `app_...`, the record in /admin/applications (when Supabase is on) |

So the subject reads "Internship application enquiry: Asha Verma, Delhi Technological
University", and everything that matters is under **Message**. The form asks for links, not
files: EmailJS cannot carry an attachment, so the page tells applicants to share a resume
as a Google Drive or GitHub link. The page shows "Application received" only when this
e-mail was accepted by EmailJS or, once Supabase is on, the row was inserted. Otherwise it
says the application did not send and offers WhatsApp with the application written in.

## Two e-mails for one pop-up enquiry

The pop-up asks for only three things (need, website, phone number), and sends them right
away. The first e-mail has no name, so `from_name` falls back to the website. A visitor who
closes the card at that point still reaches you. After the thank-you, the card offers an
optional second step (name, business, city, start date, budget, email, message). If they
fill it in, a second e-mail arrives with `follow_up_of` set to the first one's
`submission_id`, and that is where the name arrives. In /admin/submissions the two show as
one lead.

## Checking it without a real send

`scripts/e2e-lead-popup.mjs` replaces api.emailjs.com with a local stub, then checks the
variables the site sends: `need`, `website`, `phone`, `source`, `page`, `message`,
`whatsapp_link`, `organisation`, `city`, `timeline`, `budget` and `follow_up_of`. It does not test the
template. After pasting, send one real enquiry and read the e-mail.
