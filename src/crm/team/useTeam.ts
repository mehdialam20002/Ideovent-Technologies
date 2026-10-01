import { useCallback, useEffect, useState } from "react";
import { getOutreachStore } from "@/lib/outreach/store";
import { crmErrorText } from "@/lib/outreach/access";
import type { CrmMember } from "@/lib/outreach/team";
import { useCrmMe } from "../useCrmMe";
import { useCrmData } from "../useCrmData";

/**
 * THE TEAM ROWS (crm_members) for the Team screens and the assignee pickers.
 *
 * Mehdi and admins read every row (names, roles, switches, New caps); anyone
 * else reads nothing here. One read is shared by every screen and picker on
 * the page and kept for a minute, so opening a menu costs no request; a
 * change made on the Team page reads it again at once (refresh).
 *
 * Keyed by who is signed in: in local mode "Act as" switches person, and a
 * member must never see the owner's copy.
 */

const FRESH_MS = 60_000;
let cache: { key: string; at: number; rows: CrmMember[] } | null = null;
let pending: { key: string; p: Promise<CrmMember[]> } | null = null;
const subscribers = new Set<(key: string, rows: CrmMember[]) => void>();

function readMembers(key: string, force: boolean): Promise<CrmMember[]> {
  if (!force && cache && cache.key === key && Date.now() - cache.at < FRESH_MS) return Promise.resolve(cache.rows);
  if (!force && pending && pending.key === key) return pending.p;
  const p = getOutreachStore()
    .listMembers()
    .then((rows) => {
      cache = { key, at: Date.now(), rows };
      for (const s of subscribers) s(key, rows);
      return rows;
    })
    .finally(() => {
      if (pending?.p === p) pending = null;
    });
  pending = { key, p };
  return p;
}

export interface MembersState {
  /** Owner first, then active people, then by name. Empty for anyone but Mehdi and admins. */
  members: CrmMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMembers(): MembersState {
  const { me, ready } = useCrmMe();
  const key = `${me.memberId || ""}|${me.role || ""}`;
  const allowed = ready && !me.legacy && (me.role === "owner" || me.role === "admin");
  const [rows, setRows] = useState<CrmMember[]>(() => (cache && cache.key === key ? cache.rows : []));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = (k: string, r: CrmMember[]) => {
      if (k === key) setRows(r);
    };
    subscribers.add(on);
    return () => {
      subscribers.delete(on);
    };
  }, [key]);

  const load = useCallback(
    async (force: boolean) => {
      if (!allowed) {
        setRows((prev) => (prev.length ? [] : prev));
        return;
      }
      if (!(cache && cache.key === key)) setLoading(true);
      try {
        setRows(await readMembers(key, force));
        setError(null);
      } catch (e) {
        setError(crmErrorText(e));
      } finally {
        setLoading(false);
      }
    },
    [key, allowed],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  return { members: rows, loading: allowed && loading, error, refresh };
}

/** Forget the shared copy (after a write that changes the team). */
export function dropMembersCache(): void {
  cache = null;
}

/**
 * After a change to the team: the rows, who is signed in and the names
 * (crm_me, crm_team), and the CRM's leads (a switch-off moves leads).
 */
export function useTeamRefresh(): () => Promise<void> {
  const { refresh: refreshMe } = useCrmMe();
  const { refresh: refreshData } = useCrmData();
  const { refresh: refreshMembers } = useMembers();
  return useCallback(async () => {
    dropMembersCache();
    await Promise.all([refreshMembers(), refreshMe(), refreshData()]);
  }, [refreshMembers, refreshMe, refreshData]);
}

/** The store's team functions, as the signed-in person (local mode: the person acted as). */
export const teamStore = () => getOutreachStore();
