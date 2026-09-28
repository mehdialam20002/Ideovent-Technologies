import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useCrmData } from "../useCrmData";
import { buildRows, readFilters, writeFilters, type LeadFilters, type LeadRow } from "./leadQuery";

/**
 * The rows of every lead plus the filters in the URL. The table and the
 * pipeline both use this, so a filter set on one is still set on the other
 * (the switch between them carries the query string).
 */
export function useLeadRows() {
  const data = useCrmData();
  const { leads, events, opens, demoForLead, now } = data;
  const [params, setParams] = useSearchParams();

  const rows: LeadRow[] = useMemo(() => buildRows(leads, events, opens, demoForLead, now), [leads, events, opens, demoForLead, now]);
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
