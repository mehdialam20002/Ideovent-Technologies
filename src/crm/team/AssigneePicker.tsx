import { useMemo } from "react";
import { heldBy } from "@/lib/outreach/access";
import type { CrmRole } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";
import { crm } from "../ui";
import { useMembers } from "./useTeam";

/**
 * WHO WORKS A LEAD (spec 10.3): the people a lead can be assigned to.
 *
 * Mehdi and admins only (the database's crm_assign_leads refuses anyone else).
 * Options: the signed-in person first ("Me (Mehdi Alam)"), then Mehdi, the
 * admins and the members, active only; each member with their queue against
 * their cap ("Asha · 7/10 new": New leads nobody has written to yet, the
 * number the database caps); then Unassigned, the pool, when asked for.
 * Loads are counted from the leads on screen (Mehdi and admins read every
 * lead), so they move the moment an assignment lands.
 */

export interface AssigneeOption {
  /** null: Unassigned (the pool). */
  id: string | null;
  label: string;
  name: string;
  role?: CrmRole;
  me?: boolean;
  /** New leads waiting, and (members) the New-lead cap. */
  queue?: number;
  cap?: number;
}

const ORDER: Record<CrmRole, number> = { owner: 0, admin: 1, member: 2 };

export function useAssigneeOptions(opts: { includeUnassigned?: boolean; showLoad?: boolean; exclude?: string[] } = {}): AssigneeOption[] {
  const { me, team } = useCrmMe();
  const { leads } = useCrmData();
  const { members } = useMembers();
  const exclude = (opts.exclude || []).join("|");
  return useMemo(() => {
    const rows = new Map(members.map((m) => [m.id, m]));
    const skip = new Set(exclude ? exclude.split("|") : []);
    const people = team
      .filter((t) => t.active && !skip.has(t.id))
      .sort((a, b) => Number(b.id === me.memberId) - Number(a.id === me.memberId) || ORDER[a.role] - ORDER[b.role]
        || a.displayName.localeCompare(b.displayName));
    const out: AssigneeOption[] = people.map((p) => {
      const mine = p.id === me.memberId;
      const queue = heldBy(leads, p.id).newLeads;
      const cap = p.role === "member" ? rows.get(p.id)?.newLeadCap : undefined;
      let label = mine ? `Me (${p.displayName})` : p.displayName;
      if (opts.showLoad && p.role === "member") label += cap ? ` · ${queue}/${cap} new` : ` · ${queue} new`;
      else if (opts.showLoad && p.role === "admin" && !mine) label += " · admin";
      return { id: p.id, label, name: p.displayName, role: p.role, me: mine, queue, cap };
    });
    if (opts.includeUnassigned) out.push({ id: null, label: "Unassigned", name: "Unassigned" });
    return out;
  }, [team, me.memberId, leads, members, exclude, opts.includeUnassigned, opts.showLoad]);
}

export interface AssigneePickerProps {
  value: string | null;
  onChange(id: string | null): void;
  includeUnassigned?: boolean;
  showLoad?: boolean;
  disabled?: boolean;
  /* Optional extras. */
  id?: string;
  /** The accessible name (default "Assigned to"). */
  label?: string;
  /** People not to offer (the person being switched off). */
  exclude?: string[];
  className?: string;
  testId?: string;
}

/** A native select: one tap on a phone, the keyboard and screen readers for free. */
export function AssigneePicker(p: AssigneePickerProps) {
  const { nameOf } = useCrmMe();
  const options = useAssigneeOptions({ includeUnassigned: p.includeUnassigned, showLoad: p.showLoad, exclude: p.exclude });
  const value = p.value ?? "";
  const listed = options.some((o) => (o.id ?? "") === value);
  return (
    <select
      id={p.id}
      aria-label={p.label || "Assigned to"}
      data-testid={p.testId || "assignee-picker"}
      value={value}
      disabled={p.disabled}
      onChange={(e) => p.onChange(e.target.value || null)}
      className={cn(crm.input, "cursor-pointer pr-8 max-md:h-11 max-md:text-base", p.className)}
    >
      {!listed && (value ? <option value={value}>{nameOf(value)}</option> : <option value="" disabled>Pick a person</option>)}
      {options.map((o) => (
        <option key={o.id ?? ""} value={o.id ?? ""}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
