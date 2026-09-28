import { useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, ChevronDown, Download, Tag, Trash2, UserRound, X } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { crm, StatusDot } from "../ui";
import { dateInputToIso } from "./leadQuery";

export interface BulkApi {
  count: number;
  people: string[];
  clear: () => void;
  /** Runs a write on the selection and reports the result in the live region. */
  run: (label: string, fn: () => Promise<void>) => Promise<void>;
  patch: (p: Partial<OutreachLead>) => Promise<void>;
  setStatus: (s: LeadStatus) => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  exportCsv: () => void;
  remove: () => Promise<void>;
}

const bar = cn(crm.btn, "max-md:h-11");

function PopForm({ trigger, title, children, onSubmit }: { trigger: ReactNode; title: string; children: ReactNode; onSubmit: () => void }) {
  const [open, setOpen] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={bar}>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <form onSubmit={submit} className="space-y-2">
          <p className="text-[13px] font-medium">{title}</p>
          {children}
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Shown while rows are selected. Every action works on the selection only. */
export function BulkBar({ api }: { api: BulkApi }) {
  const [date, setDate] = useState("");
  const [who, setWho] = useState("");
  const [tag, setTag] = useState("");
  const [confirm, setConfirm] = useState(false);
  const n = api.count;
  const days = (d: number) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(10, 0, 0, 0);
    return x.toISOString();
  };

  return (
    <div role="toolbar" aria-label="Bulk actions"
      className="sticky top-0 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card px-3 py-2 shadow-sm max-md:fixed max-md:inset-x-3 max-md:bottom-20 max-md:top-auto max-md:flex-nowrap max-md:overflow-x-auto [&>*]:shrink-0">
      <span className={cn("mr-1 text-[13px] font-medium", crm.num)}>{n} selected</span>

      <DropdownMenu>
        <DropdownMenuTrigger className={bar}>Set status <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LEAD_STATUSES.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => void api.run(`Status set to ${LEAD_STATUS_LABELS[s]}`, () => api.setStatus(s))}>
              <StatusDot status={s} className="mr-2" /> {LEAD_STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <PopForm title="Next action date" onSubmit={() => {
        const iso = dateInputToIso(date);
        if (iso) void api.run("Next action date set", () => api.patch({ nextActionAt: iso }));
      }} trigger={<><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Next action</>}>
        <div className="flex flex-wrap gap-1.5">
          {[["Today", 0], ["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7]].map(([l, d]) => (
            <button key={l} type="button" className={cn(crm.btn, "h-8 px-2 text-[12px]")}
              onClick={() => void api.run(`Next action set to ${String(l).toLowerCase()}`, () => api.patch({ nextActionAt: days(Number(d)) }))}>{l}</button>
          ))}
        </div>
        <input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className={crm.input} />
        <div className="flex justify-between gap-2">
          <button type="button" className={crm.btnGhost} onClick={() => void api.run("Next action cleared", () => api.patch({ nextActionAt: undefined }))}>Clear date</button>
          <button type="submit" className={crm.btnPrimary} disabled={!date}>Set</button>
        </div>
      </PopForm>

      <PopForm title="Assign to" onSubmit={() => void api.run(who.trim() ? `Assigned to ${who.trim()}` : "Unassigned", () => api.patch({ assignedTo: who.trim() || undefined }))}
        trigger={<><UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Assign</>}>
        <input list="crm-people" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Name (empty to unassign)" aria-label="Name" className={crm.input} autoFocus />
        <datalist id="crm-people">{api.people.map((p) => <option key={p} value={p} />)}</datalist>
        <button type="submit" className={cn(crm.btnPrimary, "w-full")}>{who.trim() ? "Assign" : "Unassign"}</button>
      </PopForm>

      <PopForm title="Add a tag" onSubmit={() => tag.trim() && void api.run(`Tag "${tag.trim()}" added`, () => api.addTag(tag.trim()))}
        trigger={<><Tag className="h-3.5 w-3.5" aria-hidden="true" /> Tag</>}>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. patna-batch-2" aria-label="Tag" className={crm.input} autoFocus />
        <button type="submit" className={cn(crm.btnPrimary, "w-full")} disabled={!tag.trim()}>Add tag</button>
      </PopForm>

      <button type="button" className={bar} onClick={api.exportCsv}><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV</button>
      <button type="button" className={cn(bar, "text-destructive hover:bg-destructive/10")} onClick={() => setConfirm(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
      </button>
      <button type="button" className={cn(crm.btnGhost, "ml-auto max-md:h-11")} onClick={api.clear} aria-label="Clear selection">
        <X className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Clear</span>
      </button>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {n} {n === 1 ? "lead" : "leads"}?</AlertDialogTitle>
            <AlertDialogDescription>Their history goes too. This cannot be undone. Export them first if you may need them.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void api.run(`${n} ${n === 1 ? "lead" : "leads"} deleted`, api.remove)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
