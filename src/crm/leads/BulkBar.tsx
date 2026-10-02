import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CalendarClock, ChevronDown, Download, Shuffle, Tag, Trash2, UserRound, X } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus, type OutreachLead } from "@/lib/outreach/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { crm, StatusDot } from "../ui";
import type { AssigneeOption } from "../team/AssigneePicker";
import { dateInputToIso } from "./leadQuery";

export interface BulkApi {
  count: number;
  /** The old free-text labels (before the team: the Assign box suggests them). */
  people: string[];
  clear: () => void;
  /** Runs a write on the selection and reports the result in the live region (a returned string replaces "<label>."). */
  run: (label: string, fn: () => Promise<void | string>) => Promise<void>;
  patch: (p: Partial<OutreachLead>) => Promise<void>;
  /** With `extra` (a member's Lost reason) saved in the same change. */
  setStatus: (s: LeadStatus, extra?: Partial<OutreachLead>) => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  /** Mehdi only (spec 4.1): absent for anyone else. */
  exportCsv?: () => void;
  /** Mehdi only: absent for anyone else. */
  remove?: () => Promise<void>;
  /** Why some of the selection cannot move to this status (null: all can). */
  statusBlock?: (s: LeadStatus) => string | null;
  /** True for a member: Lost asks why (the database refuses Lost without a reason). */
  lostNeedsReason?: boolean;
  /** Before the team (legacy): Mehdi's free-text "Assign" label, as it always was. */
  labelAssign?: boolean;
  /** The team (Mehdi and admins): the people the selection can go to. Absent before the team and for members. */
  assignees?: AssigneeOption[];
  assign?: (memberId: string | null, name: string) => Promise<string>;
  /** Opens Share out for the selection. */
  shareOut?: () => void;
}

const bar = cn(crm.btn, "max-md:h-11");

/** The reasons a member picks from when a lead is lost (spec 10.7); the last lets them type one. */
export const LOST_REASONS = ["Has a website vendor", "No budget", "Not interested", "Wrong number or closed", "No reply after the last message"];

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

/**
 * WHY IS IT LOST: a member must say (the database refuses Lost without a
 * reason). One tap for the usual ones, or type one.
 */
export function LostReasonPrompt({ open, count = 1, onCancel, onConfirm }: {
  open: boolean;
  count?: number;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [pick, setPick] = useState("");
  const [other, setOther] = useState("");
  useEffect(() => {
    if (!open) return;
    setPick("");
    setOther("");
  }, [open]);
  const reason = pick === "other" ? other.trim() : pick;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent data-testid="lost-reason" className="max-w-sm rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-base">Why {count === 1 ? "is this lead" : `are these ${count} leads`} lost?</DialogTitle>
          <DialogDescription className="text-[13px]">Mehdi reads this to learn what stops a sale.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason) onConfirm(reason);
          }}
        >
          {[...LOST_REASONS, "other"].map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] md:min-h-9">
              <input type="radio" name="lost-reason" checked={pick === r} onChange={() => setPick(r)} />
              {r === "other" ? "Other (type it)" : r}
            </label>
          ))}
          {pick === "other" && (
            <input autoFocus value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} aria-label="The reason"
              placeholder="In a few words" className={cn(crm.input, "max-md:h-11")} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={crm.btn} onClick={onCancel}>Cancel</button>
            <button type="submit" className={crm.btnPrimary} disabled={!reason}>Mark Lost</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shown while rows are selected. Every action works on the selection only,
 * and offers only what the person signed in may do (spec 4.1): Export and
 * Delete are Mehdi's; Assign and Share out are Mehdi's and admins' (since
 * the team, a person from the team, not a typed name); a status the database
 * would refuse for some of the selection is disabled, with why.
 */
export function BulkBar({ api }: { api: BulkApi }) {
  const [date, setDate] = useState("");
  const [who, setWho] = useState("");
  const [tag, setTag] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [askLost, setAskLost] = useState(false);
  const n = api.count;
  const days = (d: number) => {
    const x = new Date();
    x.setDate(x.getDate() + d);
    x.setHours(10, 0, 0, 0);
    return x.toISOString();
  };
  const pickStatus = (s: LeadStatus) => {
    if (s === "lost" && api.lostNeedsReason) setAskLost(true);
    else void api.run(`Status set to ${LEAD_STATUS_LABELS[s]}`, () => api.setStatus(s));
  };

  return (
    <div role="toolbar" aria-label="Bulk actions"
      className="sticky top-0 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card px-3 py-2 shadow-sm max-md:fixed max-md:inset-x-3 max-md:bottom-20 max-md:top-auto max-md:flex-nowrap max-md:overflow-x-auto [&>*]:shrink-0">
      <span className={cn("mr-1 text-[13px] font-medium", crm.num)}>{n} selected</span>

      <DropdownMenu>
        <DropdownMenuTrigger className={bar}>Set status <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-[18rem]">
          {LEAD_STATUSES.map((s) => {
            const why = api.statusBlock?.(s) || null;
            return (
              <DropdownMenuItem key={s} disabled={Boolean(why)} onSelect={() => pickStatus(s)} className="items-start">
                <StatusDot status={s} className="mr-2 mt-1.5" />
                <span className="min-w-0">
                  {LEAD_STATUS_LABELS[s]}
                  {why && <span className="block text-[11px] leading-snug text-muted-foreground">{why}</span>}
                </span>
              </DropdownMenuItem>
            );
          })}
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

      {api.assignees && api.assign ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={bar} data-testid="bulk-assign">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Assign to <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[60vh] min-w-[14rem] overflow-y-auto">
            <DropdownMenuLabel className="text-[12px] font-normal text-muted-foreground">Assign {n === 1 ? "this lead" : `these ${n}`} to</DropdownMenuLabel>
            {api.assignees.map((o, i) => (
              <Fragment key={o.id ?? "none"}>
                {o.id === null && i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem data-testid={`assign-to-${o.id ?? "none"}`}
                  onSelect={() => void api.run(`Assigned to ${o.name}`, () => api.assign(o.id, o.name))}>
                  {o.id === null ? <span className="text-muted-foreground">{o.label}</span> : o.label}
                </DropdownMenuItem>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        api.labelAssign && (
          <PopForm title="Assign to" onSubmit={() => void api.run(who.trim() ? `Assigned to ${who.trim()}` : "Unassigned", () => api.patch({ assignedTo: who.trim() || undefined }))}
            trigger={<><UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Assign</>}>
            <input list="crm-people" value={who} onChange={(e) => setWho(e.target.value)} placeholder="Name (empty to unassign)" aria-label="Name" className={crm.input} autoFocus />
            <datalist id="crm-people">{api.people.map((p) => <option key={p} value={p} />)}</datalist>
            <button type="submit" className={cn(crm.btnPrimary, "w-full")}>{who.trim() ? "Assign" : "Unassign"}</button>
          </PopForm>
        )
      )}
      {api.shareOut && (
        <button type="button" className={bar} onClick={api.shareOut} data-testid="bulk-share-out">
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Share out
        </button>
      )}

      <PopForm title="Add a tag" onSubmit={() => tag.trim() && void api.run(`Tag "${tag.trim()}" added`, () => api.addTag(tag.trim()))}
        trigger={<><Tag className="h-3.5 w-3.5" aria-hidden="true" /> Tag</>}>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. patna-batch-2" aria-label="Tag" className={crm.input} autoFocus />
        <button type="submit" className={cn(crm.btnPrimary, "w-full")} disabled={!tag.trim()}>Add tag</button>
      </PopForm>

      {api.exportCsv && <button type="button" className={bar} onClick={api.exportCsv}><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV</button>}
      {api.remove && (
        <button type="button" className={cn(bar, "text-destructive hover:bg-destructive/10")} onClick={() => setConfirm(true)}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      )}
      <button type="button" className={cn(crm.btnGhost, "ml-auto max-md:h-11")} onClick={api.clear} aria-label="Clear selection">
        <X className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Clear</span>
      </button>

      {api.remove && (
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
      )}
      <LostReasonPrompt open={askLost} count={n} onCancel={() => setAskLost(false)}
        onConfirm={(reason) => {
          setAskLost(false);
          void api.run("Marked Lost", () => api.setStatus("lost", { lostReason: reason }));
        }} />
    </div>
  );
}
