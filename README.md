# Ideovent Technologies

A world-class, fully dynamic digital-agency website with a built-in content manager,
QR-verifiable certificate system, and an internship LaunchPad — built with Vite, React,
TypeScript, Tailwind CSS, shadcn/ui and Framer Motion.

## Highlights

- **Every word is editable** from `/admin` — no code needed. Hero, services, projects,
  blog, team, testimonials, milestones, FAQs, stats, navigation, contact details, legal
  pages and the internship program are all content-managed.
- **Premium, animated UI** — dark-first design with a light theme, kinetic typography,
  smooth scrolling (Lenis), scroll reveals and micro-interactions (Framer Motion), fully
  responsive and `prefers-reduced-motion` aware.
- **Certificate + QR system** — issue QR-verifiable intern certificates in seconds, with
  auto-generated unique IDs, revoke support, and a hardened `/verify/:id` page.
- **Works with zero backend** (local mode) and upgrades to a free **Supabase** backend for
  live, global updates, admin auth and image uploads — see [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).
- **SEO-ready** — per-route titles/OG tags via `react-helmet-async`, structured data, and a
  web manifest.

## Getting started

```sh
npm install
npm run dev      # http://localhost:8080
npm run build    # production build
```

## The admin

Visit **`/admin`**. In local mode the default passcode is `ideovent2026`
(change it with `VITE_ADMIN_PASSCODE`). With Supabase configured, log in with your email
and password instead.

From the admin you can manage all content, view contact leads and internship applications,
issue/revoke certificates with live QR codes, and **Export/Import** the whole site content
as JSON. See [`.env.example`](.env.example) for all configuration options.

## Tech

Vite · React 18 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Lenis ·
react-router-dom · react-helmet-async · qrcode.react · Supabase (optional).
