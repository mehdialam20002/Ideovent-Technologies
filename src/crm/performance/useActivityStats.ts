import { useEffect, useMemo, useState } from "react";
import { crmErrorText, istDay, istStartOfDay } from "@/lib/outreach/access";
import type { MemberStats } from "@/lib/outreach/team";
import { useCrmData } from "../useCrmData";

/**
 * NUMBERS PER PERSON (crm_activity_stats), for My day and Team > Performance.
 *
 * One server function counts them for everybody (the owner and admins get
 * every person, a member their own row), so an intern's My day and Mehdi's
 * Team page always agree. Periods are India-time calendar days, as the
 * database counts "today".
 */

const DAY_MS = 864e5;

/** Monday 00:00 India time of the week `now` falls in. */
export function istStartOfWeek(now = new Date()): Date {
  const start = istStartOfDay(now);
  const weekday = new Date(start.getTime() + 5.5 * 3600e3).getUTCDay(); // 0 Sunday
  return new Date(start.getTime() - ((weekday + 6) % 7) * DAY_MS);
}

/** The 1st of the month `now` falls in, 00:00 India time. */
export function istStartOfMonth(now = new Date()): Date {
  return new Date(Date.parse(istDay(now).slice(0, 8) + "01T00:00:00.000Z") - 5.5 * 3600e3);
}

/** 00:00 India time, `days - 1` days before today: the last `days` calendar days, today included. */
export function istLastDays(days: number, now = new Date()): Date {
  return new Date(istStartOfDay(now).getTime() - (days - 1) * DAY_MS);
}

export type StatsPeriod = "today" | "week" | "7d" | "14d" | "month";

/** When a period starts (its end is now). */
export function periodStart(p: StatsPeriod, now = new Date()): Date {
  if (p === "today") return istStartOfDay(now);
  if (p === "week") return istStartOfWeek(now);
  if (p === "7d") return istLastDays(7, now);
  if (p === "14d") return istLastDays(14, now);
  return istStartOfMonth(now);
}

export interface StatsState {
  /** null until the first answer. */
  rows: MemberStats[] | null;
  error: string | null;
  loading: boolean;
}

/**
 * The numbers since each period's start, re-read whenever the history or the
 * requests change (a send, a hand-over Mehdi accepts) and when the day turns.
 * Nothing is read without the team (legacy mode) or without access.
 */
export function useActivityStats(periods: readonly StatsPeriod[]): Record<StatsPeriod, StatsState> {
  const { activityStats, me, now, events, requests } = useCrmData();
  const enabled = Boolean(me.role) && !me.legacy;
  const starts = periods.map((p) => `${p}=${periodStart(p, now).toISOString()}`).join("&");
  const changed = `${events.length}|${events[0]?.id ?? ""}|${requests.length}|${requests.filter((r) => r.resolvedAt).length}`;
  const [state, setState] = useState<Partial<Record<StatsPeriod, StatsState>>>({});

  useEffect(() => {
    if (!enabled || !starts) return;
    let alive = true;
    const wanted = starts.split("&").map((kv) => kv.split("=") as [StatsPeriod, string]);
    setState((prev) => {
      const next = { ...prev };
      for (const [p] of wanted) next[p] = { rows: prev[p]?.rows ?? null, error: null, loading: true };
      return next;
    });
    for (const [p, from] of wanted) {
      activityStats(from).then(
        (rows) => alive && setState((prev) => ({ ...prev, [p]: { rows, error: null, loading: false } })),
        (err) => alive && setState((prev) => ({ ...prev, [p]: { rows: prev[p]?.rows ?? null, error: crmErrorText(err), loading: false } })),
      );
    }
    return () => {
      alive = false;
    };
  }, [enabled, starts, changed, activityStats]);

  return useMemo(() => {
    const out = {} as Record<StatsPeriod, StatsState>;
    for (const p of ["today", "week", "7d", "14d", "month"] as StatsPeriod[]) {
      out[p] = state[p] || { rows: null, error: null, loading: enabled && periods.includes(p) };
    }
    return out;
  }, [state, enabled, periods]);
}

/** One person's row (a member's own; zeros until it answers). */
export function rowOf(rows: MemberStats[] | null | undefined, memberId: string | null | undefined): MemberStats | undefined {
  return memberId ? (rows || []).find((r) => r.memberId === memberId) : undefined;
}
