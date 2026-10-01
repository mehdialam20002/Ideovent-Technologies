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

Testing it locally: `node scripts/test-crm-rls.mjs` runs 298 checks on a real PostgreSQL (PGlite,
in Node; it needs the dev dependency `@electric-sql/pglite`, or `PGLITE_FROM` pointing at a folder
that has it). `CRM_RLS_NEGATIVE=select`, `guard` or `events` breaks one rule on purpose, and the run
must then fail. `CRM_GRANTS=legacy` runs it with the table grants Supabase gave before 30 Oct 2026.

To undo the database rules (not expected; the code can be rolled back on its own): drop the 0011
policies and recreate 0007's four admin-only policies on each outreach table; drop the triggers
`crm_leads_guard`, `crm_leads_after`, `crm_events_guard` and `crm_events_after`, and
`crm_demo_open_guard` on `public.content`; recreate 0005's "insert leads anon" policy. The new
tables and columns can stay; the old CRM ignores them.
