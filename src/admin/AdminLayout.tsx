import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Download, Upload, RotateCcw, LogOut, ExternalLink, Menu, X, Circle } from "lucide-react";
import { useCms, useDeferredBodies } from "@/lib/cms/context";
import { useAdminAuth } from "./auth";
import { getIcon } from "@/lib/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { collectionSchemas, singletonSchemas } from "./schemas";
import { cn } from "@/lib/utils";
import { useOutreachDueCount } from "./outreach/badge";

const NAV = [
  { title: "Overview", items: [{ label: "Dashboard", to: "/admin", icon: "LayoutDashboard", end: true }] },
  {
    title: "Content",
    items: [
      { label: "Home Hero", to: "/admin/s/home", icon: "Home" },
...(["services", "projects", "posts", "team", "testimonials", "milestones", "process", "faqs", "stats", "clients", "socials"] as const).map((k) => ({
        label: collectionSchemas[k]!.label, to: `/admin/c/${k}`, icon: collectionSchemas[k]!.icon,
      })),
    ],
  },
  /* Its own group, not a row under Content. A pitch page is outbound: it is
     written for one named institute and sent to them, and it is the only thing
     in the panel that produces a link somebody pastes into WhatsApp. Filing it
     next to Services and Blog Posts would read as another part of the public
     site, which is exactly what it is not. */
  {
    title: "Outbound",
    items: [
      { label: collectionSchemas.pitchPages!.label, to: "/admin/c/pitchPages", icon: collectionSchemas.pitchPages!.icon },
      /* Demo sites sit beside the pitch pages because they go out the same
         way, to the same person, from the same phone. They are listed SECOND
         and not first only because the pitch pages were here first; nothing
         about the order says which to send. The two are different
         conversations and the admin says so on both screens. */
      { label: collectionSchemas.demoSites!.label, to: "/admin/c/demoSites", icon: collectionSchemas.demoSites!.icon },
      /* The ten fixed templates, in their own tab so the Demo sites list holds
         only real demos. Preview and duplicate only: see AdminTemplates.tsx. */
      { label: "Templates", to: "/admin/templates", icon: "LayoutGrid" },
      /* Leads, follow-ups and the compose panel that opens Gmail or WhatsApp
         typed and ready. The badge is today's due follow-ups. */
      { label: "Outreach", to: "/admin/outreach", icon: "Send", badge: "outreachDue" },
    ],
  },
  { title: "Certificates", items: [{ label: "Certificates & QR", to: "/admin/certificates", icon: "Award" }] },
  {
    title: "Leads",
    items: [
      { label: "Contact leads", to: "/admin/submissions", icon: "Inbox" },
      { label: "Applications", to: "/admin/applications", icon: "GraduationCap" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Site settings", to: "/admin/s/settings", icon: "Settings" },
      { label: "Contact / NAP", to: "/admin/s/contact", icon: "Phone" },
      { label: "Navigation", to: "/admin/s/navigation", icon: "Menu" },
      { label: "Internship", to: "/admin/s/internship", icon: "GraduationCap" },
      /* EduFlow had a schema and a working /admin/s/eduflow route but no link
       * to it, so the only way in was to type the URL. That matters more here
       * than on the other singletons: /eduflow deliberately renders nothing at
       * all for the values nobody has decided yet, pilot seats, pilot price,
       * what works today, target date, demo URL, roadmap URL. And both the
       * page and its schema tell Mehdi to fill them in "from /admin → EduFlow".
       * Without this row that instruction pointed at a door with no handle. */
      { label: "EduFlow", to: "/admin/s/eduflow", icon: singletonSchemas.eduflow.icon },
      { label: "Legal", to: "/admin/s/legal", icon: "Scale" },
      /* Keys for reading posters with AI. Under Settings because it is set once
         and left alone, not something touched per demo. */
      { label: "AI keys", to: "/admin/ai-keys", icon: "Lock" },
    ],
  },
];

export default function AdminLayout() {
  // The public site defers the blog and legal bodies out of the entry chunk and
  // only the pages that render them ask for them. The admin edits and EXPORTS
  // them, so it must have the whole snapshot: without this, opening /admin and
  // hitting Export would download a JSON file with nine empty article bodies and
  // four empty policies. Requested here, at the shell, so every editor beneath it
  // is covered rather than each one remembering.
  useDeferredBodies();
  const { mode, actions } = useCms();
  const { logout } = useAdminAuth();
  const outreachDue = useOutreachDueCount();

  // Content is loaded once, when the site first opens. On a visit to /admin that
  // happens BEFORE sign-in, as a visitor, and Supabase's rules then hide leads,
  // applications and every draft, so the panel showed "0 total" to a signed-in
  // admin until a manual refresh (found live, 26 Sep 2026). This shell only
  // mounts behind the sign-in, so reload here, as the admin.
  useEffect(() => {
    if (mode === "supabase") void actions.refresh();
  }, [mode, actions]);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile drawer and hands focus back to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const doExport = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideovent-content.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const doImport = async (file: File) => {
    try {
      await actions.importJson(await file.text());
      alert("Content imported.");
    } catch (e) {
      alert("Import failed: " + (e as Error).message);
    }
  };
  const doReset = async () => {
    if (confirm("Reset ALL content to defaults? Your local edits will be lost.")) await actions.reset();
  };

  const Sidebar = (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <span className="font-display text-lg font-semibold">Ideovent</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">Admin</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={(item as any).end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", isActive ? "bg-primary/10 font-medium text-primary": "text-muted-foreground hover:bg-muted hover:text-foreground")
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                      {(item as any).badge === "outreachDue" && outreachDue > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground" aria-label={`${outreachDue} follow-ups due today`}>
                          {outreachDue}
                        </span>
                      )}
                    </NavLink>
                  </li>
);
              })}
            </ul>
          </div>
))}
      </nav>
    </aside>
);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">{Sidebar}</div>
      {/*
        The mobile drawer could be opened from the keyboard but not closed from it:
        the only dismissal was a click on the backdrop <div>, which is not focusable,
        and there was no Escape handler and no close button. Both added, and focus
        returns to the toggle that opened it.
      */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div id="admin-sidebar" className="relative">
            <button
              type="button"
              aria-label="Close the admin menu"
              onClick={() => {
                setOpen(false);
                menuButtonRef.current?.focus();
              }}
              className="absolute right-2 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {Sidebar}
          </div>
        </div>
)}

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Wraps rather than overflows. The right-hand cluster is six 36px controls
          (Export, Import, Reset, View site, Theme, Log out) and at 375px the two
          clusters together measured 394px against a 375px viewport, 19px of
          horizontal page scroll on every admin route, in both themes. `flex-wrap`
          with a min-height instead of a fixed h-16 lets the action cluster drop to
          a second row on a phone; at >= sm the labels return and it fits on one
          row again, so nothing above 375px changes and no control is hidden or
          pushed off-screen.
        */}
        <header className="sticky top-0 z-40 flex min-h-[4rem] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button ref={menuButtonRef} type="button" aria-label="Open the admin menu" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border lg:hidden"><Menu className="h-4 w-4" aria-hidden="true" /></button>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", mode === "supabase" ? "border-success/40 text-success": "border-border text-muted-foreground")}>
              <Circle className={cn("h-2 w-2 fill-current", mode === "supabase" ? "text-success": "text-warning")} />
              {mode === "supabase" ? "Live (Supabase)": "Local mode"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Export content JSON" title="Export content JSON" onClick={doExport} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"><Download className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Export</span></button>
            <button type="button" aria-label="Import content JSON" title="Import content JSON" onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"><Upload className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Import</span></button>
            <input ref={fileRef} type="file" accept="application/json" aria-label="Content JSON file to import" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            <button type="button" aria-label="Reset all content to defaults" title="Reset to defaults" onClick={doReset} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
            <Link to="/" target="_blank" aria-label="Open the public site in a new tab" title="View site" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"><ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
            <ThemeToggle />
            <button type="button" aria-label="Log out" title="Log out" onClick={async () => { await logout(); navigate("/admin/login"); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
);
}
