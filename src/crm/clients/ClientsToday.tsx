import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM } from "../nav";
import { crm } from "../ui";
import { useOptionalClients } from "./context";
import { TaskRow } from "./TaskRow";

/**
 * TODAY > CLIENTS (client-process-spec 11.2): Mehdi only, once 0014 is there. One row per client task due
 * today or late (money late first, then other late tasks, oldest first, then today's): the business, the
 * project, the task, "today" or "N days late", and Open, which lands on the page that completes it. The
 * lead queue below is not touched.
 */
export default function ClientsToday({ className }: { className?: string }) {
  const clients = useOptionalClients();
  if (!clients || clients.status !== "ready" || !clients.due.length) return null;
  const { due, data, today } = clients;
  const who = (clientId: string, projectId: string | null) => {
    const cl = data.clients.find((c) => c.id === clientId);
    const p = projectId ? data.projects.find((x) => x.id === projectId) : null;
    return [cl?.orgName, p?.name].filter(Boolean).join(" · ");
  };
  return (
    <section className={cn(crm.panel, "p-4", className)} data-testid="clients-today" aria-label="Clients">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Clients <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums">{due.length}</span></p>
        <Link to={CRM.clients} className="text-[12px] text-primary hover:underline">All clients</Link>
      </div>
      <ul className="mt-2 space-y-1.5">
        {due.map((t) => <TaskRow key={t.id} task={t} today={today} who={who(t.clientId, t.projectId)} testId="today-client-task" />)}
      </ul>
    </section>
  );
}
