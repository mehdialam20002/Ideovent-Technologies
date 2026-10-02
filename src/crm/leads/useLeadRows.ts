import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useCrmData } from "../useCrmData";
import { buildRows, readFilters, writeFilters, type LeadFilters, type LeadRow } from "./leadQuery";

/**
 * The rows of every lead plus the filters in the URL. The table and the
 * pipeline both use this, so a filter set on one is still set on the other
 * (the switch between them carries the query string).
 *
 * Since the team (1 Oct 2026) the rows are the screen's SCOPE (spec 10.4):
 * Mehdi and admins pick Mine, Team, All or Unassigned per screen (useCrmData
 * remembers it; Leads opens on All, the Pipeline on Mine), and a member's
 * scope is always their own leads, the only ones they read. Each row names
 * who works the lead (assigneeName).
 */
export function useLeadRows() {
  const data = useCrmData();
  const { scopedLeads, events, opens, demoForLead, now, nameOf } = data;
  const [params, setParams] = useSearchParams();

  const rows: LeadRow[] = useMemo(
    () => buildRows(scopedLeads, events, opens, demoForLead, now, (id) => nameOf(id)),
    [scopedLeads, events, opens, demoForLead, now, nameOf],
  );
  const filters = useMemo(() => readFilters(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<LeadFilters>) => setParams((p) => writeFilters(p, patch), { replace: true }),
    [setParams],
  );
  const setParam = useCallback(
    (key: string, value: string) =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          if (value) n.set(key, value);
          else n.delete(key);
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { data, rows, filters, setFilters, params, setParam };
}
