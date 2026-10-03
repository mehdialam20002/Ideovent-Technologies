import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell as BellIcon, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getOutreachStore } from "@/lib/outreach/store";
import { crmErrorText } from "@/lib/outreach/access";
import type { CrmNotification, NotificationKind } from "@/lib/outreach/team";
import { cn } from "@/lib/utils";
import { ME_FOCUS_GAP_MS, ME_POLL_MS, useCrmMe } from "../useCrmMe";
import { ago } from "../dashboard/format";
import { CRM } from "../nav";
import { crm } from "../ui";

/**
 * THE BELL (spec 10.8): the person's own notifications (crm_notifications,
 * the latest 50). To a member: assigned, moved_away, demo_ready, resolved,
 * review. To Mehdi: handoff, and info (Ask Mehdi).
 *
 * Read when the CRM opens, when the tab comes back into view (at most every 15
 * seconds) and every 60 seconds while it is visible: no realtime connection.
 * Reading one, or "Mark all read", only sets read_at. It never closes a
 * request: those wait on Waiting on you until Mehdi resolves them (10.6).
 *
 * NotificationsProvider (in the CRM shell) keeps one list for the header's
 * bell and for My day's banners: useNotifications().
 */
export interface NotificationsValue {
  /** Newest first: the latest 50. */
  items: CrmNotification[];
  unread: number;
  /** False until the first answer. */
  ready: boolean;
  error: string | null;
  refresh(): Promise<void>;
  markRead(ids: number[]): Promise<void>;
  markAllRead(): Promise<void>;
}

const EMPTY: NotificationsValue = {
  items: [],
  unread: 0,
  ready: false,
  error: null,
  refresh: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
};

const Ctx = createContext<NotificationsValue | null>(null);

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { me } = useCrmMe();
  const store = useMemo(() => getOutreachStore(), []);
  /* Without 0011 (or without access) there is no bell to read. */
  const enabled = Boolean(me.role) && !me.legacy;
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await store.notifications();
      if (!alive.current) return;
      setItems(next);
      setError(null);
    } catch (err) {
      if (alive.current) setError(crmErrorText(err));
    } finally {
      if (alive.current) setReady(true);
    }
  }, [enabled, store]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    let last = Date.now();
    const onFocus = () => {
      if (!visible() || Date.now() - last < ME_FOCUS_GAP_MS) return;
      last = Date.now();
      void refresh();
    };
    const timer = window.setInterval(() => {
      if (!visible()) return;
      last = Date.now();
      void refresh();
    }, ME_POLL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, refresh]);

  const markRead = useCallback(
    async (ids: number[]) => {
      const want = new Set(ids);
      if (!enabled || !want.size) return;
      const at = new Date().toISOString();
      setItems((prev) => prev.map((n) => (want.has(n.id) && !n.readAt ? { ...n, readAt: at } : n)));
      try {
        await store.markNotificationsRead([...want]);
      } catch (err) {
        if (alive.current) setError(crmErrorText(err));
      }
      await refresh();
    },
    [enabled, store, refresh],
  );

  const markAllRead = useCallback(
    () => markRead(items.filter((n) => !n.readAt).map((n) => n.id)),
    [items, markRead],
  );

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread: items.filter((n) => !n.readAt).length, ready, error, refresh, markRead, markAllRead }),
    [items, ready, error, refresh, markRead, markAllRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The person's notifications (an empty, never-ready list outside the CRM shell). */
export function useNotifications(): NotificationsValue {
  return useContext(Ctx) || EMPTY;
}

/** How many the bell lists. */
export const BELL_SHOWS = 30;

const KIND_WORD: Record<NotificationKind, string> = {
  assigned: "Assigned",
  moved_away: "Moved",
  handoff: "Hand-over",
  review: "Fix",
  info: "Ask Mehdi",
  demo_ready: "Demo ready",
  resolved: "Done",
  /* Meta Lead Ads (0012): a new lead from a form, and the intake needing Mehdi (token, limit, Page). */
  lead_in: "New lead",
  intake: "Lead Ads",
};

/**
 * The header's bell: the unread count, and a popover with the latest 30
 * (title, time, a link to the lead) and Mark all read. Opening a line marks
 * that one read.
 */
export function Bell({ className }: { className?: string }) {
  const { items, unread, ready, error, refresh, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const shown = items.slice(0, BELL_SHOWS);
  const now = new Date();
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="crm-bell"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn(
            "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <BellIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          {unread > 0 && (
            <span
              data-testid="crm-bell-count"
              aria-hidden="true"
              className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground tabular-nums"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Notifications" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-[13px] font-semibold">Notifications</p>
          <button
            type="button"
            data-testid="crm-bell-read-all"
            disabled={!unread}
            onClick={() => void markAllRead()}
            className={cn(crm.btnGhost, "h-8 px-2 text-[12px]")}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
          </button>
        </div>
        {error && <p role="alert" className="border-b border-border px-3 py-2 text-[12px] text-destructive">{error}</p>}
        {shown.length ? (
          <ul data-testid="crm-bell-list" className="max-h-[min(60vh,26rem)] divide-y divide-border/60 overflow-y-auto">
            {shown.map((n) => {
              const body = (
                <>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px] leading-snug", !n.readAt && "font-medium")}>{n.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {KIND_WORD[n.kind] || n.kind} · {ago(n.createdAt, now)}
                      {!n.readAt && <span className="sr-only"> (unread)</span>}
                    </span>
                  </span>
                </>
              );
              const rowCls = "flex w-full gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none";
              return (
                <li key={n.id} data-kind={n.kind}>
                  {n.leadId ? (
                    <Link
                      to={CRM.lead(n.leadId)}
                      className={rowCls}
                      onClick={() => {
                        setOpen(false);
                        if (!n.readAt) void markRead([n.id]);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className={rowCls} onClick={() => !n.readAt && void markRead([n.id])}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">{ready ? "Nothing yet." : "Loading..."}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
