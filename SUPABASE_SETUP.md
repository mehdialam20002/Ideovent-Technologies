# Going live with Supabase (optional, ~15 minutes)

Your site already works **out of the box** in *local mode*. You can edit everything at
`/admin`, and changes are saved in your browser. To publish those changes for the world you
either **Export** the JSON from the admin and commit it **or** connect a free Supabase
project so every edit is live instantly for all visitors (and certificate QR codes verify for
anyone, anywhere).

Here's how to switch to live mode.

## 1. Create a free Supabase project
1. Go to <https://supabase.com> → **New project**.
2. Pick a name and a strong database password. Wait ~2 minutes for it to provision.

## 2. Run the database setup
1. In your project, open **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_content.sql`](supabase/migrations/0001_content.sql).
3. Click **Run**. This creates the `content` table, security rules, and the `media` image bucket.

## 3. Create your admin login
1. Go to **Authentication → Users → Add user**.
2. Enter your email + a password. This is what you'll use to log in at `/admin`.
   (Disable "Confirm email" so you can log in immediately, or confirm via the email link.)

## 4. Add your keys to the site
1. In Supabase go to **Settings → API** and copy the **Project URL** and the **anon public** key.
2. Create a file named `.env` in the project root (copy `.env.example`) and set
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_PUBLIC_URL=https://your-live-domain.com
   ```
3. Redeploy (or restart `npm run dev`). The admin will now show **“Live (Supabase)”**.

## 5. Push your current content up (one time)
1. Log in to `/admin` with your Supabase email/password.
2. Click **Import** in the top bar and select an exported `ideovent-content.json`
   (Export it first from a browser that has your local edits), or just start editing;
   everything you save now writes straight to Supabase.

That's it. From now on, every edit in `/admin`, text, projects, blog posts, team, and
**certificates**, is live for everyone the moment you hit Save, and image uploads go to
Supabase's CDN automatically.

### Security notes
- Public visitors can **read** site content and **submit** contact/internship forms, but they
  **cannot** read your leads or edit anything, only your logged-in admin account can.
- Certificate IDs are auto-generated and unique; revoking a certificate flips its verify page
  to **REVOKED** instantly.
- Never commit your `.env` file (it's already git-ignored).

## 0011: the CRM team

[`supabase/migrations/0011_crm_team.sql`](supabase/migrations/0011_crm_team.sql) lets other
people into the CRM on `crm.ideovent.in`. Each person sees only the leads you assign them (while
a lead is open, and for 14 days after it closes), and you, the owner, still see and control
everything. The rules live in the database (row level security and guard triggers), so no screen
can widen them. A brand-new project gets 0011 inside [`supabase/SETUP_ALL.sql`](supabase/SETUP_ALL.sql),
which carries every migration from 0001 to 0011 in order.

Before the first person signs in, in this order:

1. **Safety copy.** CRM > Leads > All > Export (CSV). Keep it somewhere private, never in this
   repository.
2. **Apply it.** Supabase > SQL Editor > New query > paste all of `0011_crm_team.sql` > **Run**.
   It is safe to run again.
3. **Check it** with the verification queries at the bottom of that file: the Unassigned pool
   holds only leads nobody has written to, no lead lacks a creator, your own row says `owner` and
   is linked to your login, and `pgcrypto` is in schema `extensions`.
4. **Prove the rules.** New query > paste all of
   [`supabase/tests/crm_team_rls.sql`](supabase/tests/crm_team_rls.sql) > **Run**. It must end
   with `ALL CRM ACCESS CHECKS PASSED`. It works in one transaction that rolls back, so it leaves
   nothing behind; a broken rule stops it at a line that starts with `FAIL:`.
5. **Authentication settings.** Sign-ups stay off. In the Email provider, set the minimum password
   length to 10. Under Audit Logs, switch on "Write audit logs to the database".

What changes, and what does not:

- Every lead, history line and setting stays where it is. Leads you have already written to (or
  moved past New) become yours; leads nobody has written to stay Unassigned, the pool you share
  out. Your "Mine" view shows the same leads as before.
- The CRM as deployed today keeps working with 0011 applied, so 0011 can go live before or after
  the new CRM code.
- No secret key is used anywhere. A login is made in Authentication > Users > Add user (tick Auto
  Confirm User), and the person is added in CRM > Team; their first sign-in links the two.
  Forgotten passwords are reset from CRM > Team.
- The site's public forms (contact, internship, demo opens) are now for visitors only, and a demo
  open carries the server's time.
- Nothing is sent to a lead on Do not contact, and a lead from a Meta form who did not tick its
  "WhatsApp and phone" box is e-mailed only: the database refuses a WhatsApp message or a call to
  them from anyone, you included, as the privacy policy promises.

Testing it locally: `node scripts/test-crm-rls.mjs` runs 348 checks on a real PostgreSQL (PGlite,
in Node; it needs the dev dependency `@electric-sql/pglite`, or `PGLITE_FROM` pointing at a folder
that has it). `CRM_RLS_NEGATIVE=select`, `guard` or `events` breaks one rule on purpose, and the run
must then fail. `CRM_GRANTS=legacy` runs it with the table grants Supabase gave before 30 Oct 2026.

To undo the database rules (not expected; the code can be rolled back on its own): drop the 0011
policies and recreate 0007's four admin-only policies on each outreach table; drop the triggers
`crm_leads_guard`, `crm_leads_after`, `crm_events_guard` and `crm_events_after`, and
`crm_demo_open_guard` on `public.content`; recreate 0005's "insert leads anon" policy. The new
tables and columns can stay; the old CRM ignores them.

## 0012: Meta Lead Ads

[`supabase/migrations/0012_meta_leads.sql`](supabase/migrations/0012_meta_leads.sql) lets leads from the
Ideovent Facebook and Instagram instant forms arrive in the CRM by themselves. Run it AFTER 0011: without
0011 it stops at its first statement and changes nothing. A brand-new project gets it inside
[`supabase/SETUP_ALL.sql`](supabase/SETUP_ALL.sql), which now carries 0001 to 0014 (0013 and 0014 below).

What it adds:

- Three tables, which only you can read: `meta_settings` (one row: two SHA-256 fingerprints, the Page,
  where new Meta leads go, the daily limit), `meta_leads` (one row per Meta lead id, so a lead never
  arrives twice and a lead you delete stays deleted) and `meta_ingest_log` (ids and outcomes). None of
  them holds a name, a phone number, an e-mail or an answer.
- The functions the webhook and the daily catch-up call with the public anon key. Each one first checks
  an ingest token worked out from `META_APP_SECRET` in Vercel; the database keeps only its SHA-256,
  stored when you press Connect in CRM > Settings > Meta Lead Ads. No secret, token or password is
  stored in Supabase.
- Two new bell kinds: "New lead" and "Lead Ads" (the intake needs you).
- One new request kind, `meta_form`. Anyone can type someone else's number into a form, so when a form
  comes with the phone number or e-mail of a lead already in the CRM, that lead only gets a plain line
  ("Someone sent the Instagram lead form with this lead's phone number"), and the form's answers wait
  for you under Today > Waiting on you. A team member never reads them.

A Meta lead is an ordinary CRM lead under 0011's rules: added by you, New, due now, in the Unassigned
pool unless you choose otherwise on the Meta page. A team member sees it only when it is assigned to them.

In this order, once the release with Meta leads is live:

1. **Apply it.** Supabase > SQL Editor > New query > paste all of `0012_meta_leads.sql` > **Run**. It is
   safe to run again.
2. **Prove the rules.** New query > paste all of [`supabase/tests/meta_leads_rls.sql`](supabase/tests/meta_leads_rls.sql)
   > **Run**. It must end with `ALL META INTAKE CHECKS PASSED`. It works in one transaction that rolls
   back, so your real settings and leads are untouched.
3. **Connect Meta**, step by step: `09-crm/META-LEADS-RUNBOOK.md` (outside this repository).

The Security Advisor lists the seven intake functions as callable by anon (lints 0028 and 0029), as it
lists 0010's `record_payment_event`. That is expected: each refuses any caller without the ingest token.

Testing it locally: `node scripts/test-meta-rls.mjs` runs the SQL on PGlite (it needs
`@electric-sql/pglite`, or `PGLITE_FROM`; `META_RLS_NEGATIVE=token` or `select` breaks a rule on purpose
and the run must then fail). `node scripts/test-meta-webhook.mjs` tests the functions with Graph and
Supabase faked (`META_WEBHOOK_NEGATIVE=1` must fail), and `node scripts/test-meta-intake.mjs` sends a
signed notification through the real webhook to the real SQL.

To undo (not expected): drop the ten `public.meta_*` functions, the `private.meta_*` helpers, the three
meta tables and the index `outreach_leads_meta_lead_idx`. Meta leads already in the CRM stay as ordinary
leads. Put 0011's bell check back only after deleting the bells of kinds `lead_in` and `intake`, and
0011's request check only after deleting the requests of kind `meta_form`.

## 0013: a demo or a pitch page by its link, never as a list

Until [`supabase/migrations/0013_rows_by_slug.sql`](supabase/migrations/0013_rows_by_slug.sql), the public anon
key (it ships in the site's JavaScript) could list every sent demo and every live pitch page in one request:
every prospect's name, city, phone number and e-mail. After it, the table lists neither to anyone but you. A
visitor's page asks `public_row_by_slug` for the one row in its link, and `public_has_rows` whether any exists.
Nothing changes for visitors. It needs only 0005, works with or without 0011 and 0012, and `SETUP_ALL.sql`
carries it.

In this order:

1. **Merge, and wait until Vercel's production deployment of it shows Ready** (Vercel > Deployments). The new code
   asks the function first and, while 0013 has not been run, reads the row the old way, so every link keeps
   working before and after the SQL. Until step 2, each demo or pitch page also prints one red `404` line in the
   browser's console: that is the page asking for a function that is not there yet. It is expected, visitors do
   not see it, and it stops at step 2, so do step 2 soon after.
2. **Apply it, once step 1 shows Ready.** Supabase > SQL Editor > New query > paste all of
   `0013_rows_by_slug.sql` > **Run**. It takes about five seconds: it adds the two functions first, gives the API
   five seconds to load them, and only then closes the list, so no page is caught in between. It is safe to run
   again.
3. **Check it** (or tell Claude to). With the anon key, the list request
   (`/rest/v1/content?collection=eq.demoSites`) must return `[]`, and a sent demo link and a live pitch page
   must still open. To prove every rule: New query > paste all of
   [`supabase/tests/rows_by_slug_rls.sql`](supabase/tests/rows_by_slug_rls.sql) > **Run**. It must end with
   `ALL ROW ACCESS CHECKS PASSED`; it works in one transaction that rolls back, so it leaves nothing behind. If
   the list still answers rows, 0013 stopped before its second step (or an older file ran after it): run 0013
   again.

**After step 2, never go back to a site from before this change.** No Vercel Instant Rollback to, and no
promoting of, a deployment built before it: that code reads a demo from the list 0013 closes, so on it every demo
and pitch link shows "Page not found". Roll forward instead. If an old deployment really must come back, undo 0013
first (below).

0001 to 0005 each rewrite the read policy: after running one of them again on its own, run 0013 again.

Accepted, not closed: a demo's slug is the business's own name, so someone with a list of names can still try
them one at a time (one demo per guess, showing what that business already publishes). Existing links stay as
they are.

Testing it locally: `node scripts/test-rows-rls.mjs` runs the rules on PGlite (as for 0011) on 0001-0010 + 0013,
on 0001-0011 + 0013 and on the whole `SETUP_ALL.sql`, then the SQL-editor test on each. It also checks the two
steps: step 1 stays if step 2 fails (and the SQL-editor test then says so), and the five-second wait happens
only where the API's role exists.
`ROWS_RLS_NEGATIVE=policy` (0005's policy put back) or `ROWS_RLS_NEGATIVE=function` (the function without its
status rule) must make it fail.

To undo (not expected): run 0005's "read public content" block again: in
[`0005_harden_admin_and_reads.sql`](supabase/migrations/0005_harden_admin_and_reads.sql), the
`drop policy if exists "read public content"` and the `create policy` after it. That opens the list again, and
the hole with it. The two functions can stay; the site reads through them either way.

## 0014: the client file

[`supabase/migrations/0014_client_process.sql`](supabase/migrations/0014_client_process.sql) gives the CRM its
client files: when a lead says yes, the client, its projects, its numbered documents (quotation, proforma,
invoice, receipt, credit note, and the welcome pack, handover document and closing letter), its payments and its
timeline. It needs only 0005 and 0007 (it stops with a plain message if they are missing), works with or without
0011, 0012 and 0013, is safe to run twice, and `SETUP_ALL.sql` carries it after 0013.

What it adds:

- Seven tables only you can read or write: `crm_client_settings` (the firm's bank details, the policy numbers,
  the first serial of a series), `crm_clients`, `crm_projects`, `crm_documents`, `crm_payments`,
  `crm_client_events` (the client's timeline) and `crm_doc_counters`. A team member, an admin and a visitor
  read nothing and write nothing: money stays with you. No table has a column for a password.
- One function, `crm_issue_document`, which gives a document its number when you press Issue: `IDV/Q/`,
  `IDV/PI/`, `IDV/`, `IDV/RC/`, `IDV/CN/`, the financial year (`2026-27`, from the India date) and the next
  serial, consecutive with no gaps. A refused issue uses no number.
- The rules, enforced by the database: an issued document never changes and is never deleted (a mistake is
  cancelled with a reason and a new one issued; a document money was received against is corrected with a
  credit note); a payment is recorded only against an issued proforma or invoice of the same client and
  project, never moves and is never deleted; a project stays with the client it was opened for; one receipt per
  payment, for the amount credited; a credit note needs both partners' written yes; the advance is billed once
  (one issued proforma for the advance, or a split advance's part 1, one for part 2 and one for each change
  request's advance per project, part 2 only with a split advance, and one refunded in full by credit notes no
  longer counts); the timeline's time is the server's, and a timeline line belongs to the client of
  its project.

In this order, once the release with client files is live (until then the Clients screen says "This needs the
client update (0014)" and nothing else changes):

1. **Apply it.** Supabase > SQL Editor > New query > paste all of `0014_client_process.sql` > **Run**. It ends
   with "Success. No rows returned" and is safe to run again.
2. **Prove the rules.** New query > paste all of [`supabase/tests/clients_rls.sql`](supabase/tests/clients_rls.sql)
   > **Run**. It must end with `ALL CLIENT FILE CHECKS PASSED`. It works in one transaction that rolls back:
   no number it issues is used up and nothing it writes stays.
3. **Numbers.** Confirm that no IDV quotation, proforma, invoice, receipt or credit note number was issued
   outside the CRM (`03-legal-docs/billing/invoice-counter.json` is empty). From the first CRM document on, the
   CRM is the only thing that numbers them: do not use `invoice-generator.py` for these series again, or two
   counters collide. If you issued numbers by hand, set the first serial of that series in CRM > Settings >
   Client process before the first issue.

Testing it locally: `node scripts/test-clients-rls.mjs` runs the SQL on PGlite (as for 0011): on 0001 to 0013
with a member and an admin, 0014 twice, every rule above, the grants, 0005, 0011 and 0012 left as they were,
the SQL-editor test (it must pass and leave nothing behind), and the whole `SETUP_ALL.sql` as a new project.
`CLIENTS_RLS_NEGATIVE=policy` (the owner check taken off the clients policy), `CLIENTS_RLS_NEGATIVE=insert`
(a document inserted already issued), `CLIENTS_RLS_NEGATIVE=advance` (the advance, part 2 or a change
request's advance billed twice) or `CLIENTS_RLS_NEGATIVE=events` (a timeline line under another client's
project) must make it fail.

To undo (not expected, and only before the first real document): drop `public.crm_issue_document`, the seven
`crm_` tables of this file, the two sequences `crm_client_code_seq` and `crm_project_code_seq`, and the
`private.crm_*` functions this file made (`crm_fy`, `crm_ist_today`, `crm_touch`, `crm_documents_guard`,
`crm_payments_guard`, `crm_projects_guard`, `crm_events_stamp`). Issued documents are tax records: once there
are any, keep the tables.
