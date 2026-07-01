import { Link } from "react-router-dom";
import { ArrowUpRight, Inbox, GraduationCap, Award } from "lucide-react";
import { useContent } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { collectionSchemas } from "@/admin/schemas";

export default function AdminDashboard() {
  const data = useContent();

  const cards = (["services", "projects", "posts", "team", "testimonials", "certificates"] as const).map((k) => ({
    key: k,
    label: collectionSchemas[k]?.label || k,
    icon: collectionSchemas[k]?.icon || "Circle",
    count: (data[k] as any[])?.length || 0,
    to: k === "certificates" ? "/admin/certificates" : `/admin/c/${k}`,
  }));

  const newLeads = data.submissions.filter((s) => s.status === "new").length;
  const pendingApps = data.applications.filter((a) => a.paymentStatus === "pending").length;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Welcome back 👋</h1>
      <p className="mt-1 text-muted-foreground">Manage every word, project, post and certificate on your site.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <Link key={c.key} to={c.to} className="group rounded-3xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-4 font-display text-3xl font-semibold">{c.count}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link to="/admin/submissions" className="flex items-center justify-between rounded-3xl border border-border bg-card/60 p-5 hover:border-primary/40">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary"><Inbox className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Contact leads</p>
              <p className="text-sm text-muted-foreground">{newLeads} new · {data.submissions.length} total</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/admin/applications" className="flex items-center justify-between rounded-3xl border border-border bg-card/60 p-5 hover:border-primary/40">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><GraduationCap className="h-5 w-5" /></span>
            <div>
              <p className="font-medium">Internship applications</p>
              <p className="text-sm text-muted-foreground">{pendingApps} pending · {data.applications.length} total</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-border p-5">
        <div className="flex items-center gap-3">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Issue a certificate</p>
            <p className="text-sm text-muted-foreground">Create QR-verifiable intern certificates in seconds.</p>
          </div>
          <Link to="/admin/certificates" className="ml-auto rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Open</Link>
        </div>
      </div>
    </div>
  );
}
