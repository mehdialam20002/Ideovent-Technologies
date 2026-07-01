# Going live with Supabase (optional, ~15 minutes)

Your site already works **out of the box** in *local mode* — you can edit everything at
`/admin`, and changes are saved in your browser. To publish those changes for the world you
either **Export** the JSON from the admin and commit it, **or** connect a free Supabase
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
2. Create a file named `.env` in the project root (copy `.env.example`) and set:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_PUBLIC_URL=https://your-live-domain.com
   ```
3. Redeploy (or restart `npm run dev`). The admin will now show **“Live (Supabase)”**.

## 5. Push your current content up (one time)
1. Log in to `/admin` with your Supabase email/password.
2. Click **Import** in the top bar and select an exported `ideovent-content.json`
   (Export it first from a browser that has your local edits) — or just start editing;
   everything you save now writes straight to Supabase.

That's it. From now on, every edit in `/admin` — text, projects, blog posts, team, and
**certificates** — is live for everyone the moment you hit Save, and image uploads go to
Supabase's CDN automatically.

### Security notes
- Public visitors can **read** site content and **submit** contact/internship forms, but they
  **cannot** read your leads or edit anything — only your logged-in admin account can.
- Certificate IDs are auto-generated and unique; revoking a certificate flips its verify page
  to **REVOKED** instantly.
- Never commit your `.env` file (it's already git-ignored).
