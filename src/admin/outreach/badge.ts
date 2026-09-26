import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { dueCount } from "./derive";
import { OUTREACH_CHANGED } from "./derive";

/**
 * The number on the "Outreach" nav item: follow-ups due today or late.
 *
 * Read on mount, on every route change inside the admin and whenever the
 * Outreach section writes. The store is imported lazily so the admin shell
 * does not carry it until the first read. Any failure (tables not created
 * yet, offline) shows no badge rather than a wrong number.
 */
export function useOutreachDueCount(): number {
  const [n, setN] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const { getOutreachStore } = await import("@/lib/outreach/store");
        const leads = await getOutreachStore().listLeads();
        if (alive) setN(dueCount(leads));
      } catch {
        if (alive) setN(0);
      }
    };
    void read();
    const on = () => void read();
    window.addEventListener(OUTREACH_CHANGED, on);
    return () => {
      alive = false;
      window.removeEventListener(OUTREACH_CHANGED, on);
    };
  }, [pathname]);

  return n;
}
