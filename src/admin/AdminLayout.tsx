import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Download, Upload, RotateCcw, LogOut, ExternalLink, Menu, X, Circle } from "lucide-react";
import { useCms } from "@/lib/cms/context";
import { useAdminAuth } from "./auth";
import { getIcon } from "@/lib/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { collectionSchemas, singletonSchemas } from "./schemas";
import { cn } from "@/lib/utils";

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
      { label: "Legal", to: "/admin/s/legal", icon: "Scale" },
    ],
  },
];

export default function AdminLayout() {
  const { mode, actions } = useCms();
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

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
                        cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
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
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border lg:hidden"><Menu className="h-4 w-4" /></button>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", mode === "supabase" ? "border-success/40 text-success" : "border-border text-muted-foreground")}>
              <Circle className={cn("h-2 w-2 fill-current", mode === "supabase" ? "text-success" : "text-warning")} />
              {mode === "supabase" ? "Live (Supabase)" : "Local mode"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={doExport} title="Export content JSON" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>
            <button onClick={() => fileRef.current?.click()} title="Import content JSON" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"><Upload className="h-4 w-4" /><span className="hidden sm:inline">Import</span></button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            <button onClick={doReset} title="Reset to defaults" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"><RotateCcw className="h-4 w-4" /></button>
            <Link to="/" target="_blank" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"><ExternalLink className="h-4 w-4" /></Link>
            <ThemeToggle />
            <button onClick={async () => { await logout(); navigate("/admin/login"); }} title="Log out" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
