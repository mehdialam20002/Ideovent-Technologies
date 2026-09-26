import { Info } from "lucide-react";
import type { DemoStatus } from "@/lib/cms/types";

/**
 * WHAT THE LINK DOES RIGHT NOW, said next to Copy link and Mark sent.
 *
 *   draft note   after Copy link on anything not yet Sent: the public route
 *                shows the 404 for it (DemoSiteRoute's rule, unchanged), so
 *                the copied link is not something to send yet
 *   local note   only without Supabase: the demo lives in this browser's
 *                storage, so nobody else can open it. Disappears by itself
 *                once the Supabase env is set, because `localOnly` comes from
 *                the store's mode
 */
export function LinkNotes({ status, showDraftNote, localOnly }: {
  status: DemoStatus;
  showDraftNote: boolean;
  localOnly: boolean;
}) {
  if (!showDraftNote && !localOnly) return null;
  const what = status === "draft" ? "This is a draft." : status === "closed" ? "This demo is closed." : "This demo is not sent yet.";
  return (
    <div className="mt-2 space-y-1.5 text-xs leading-relaxed">
      {showDraftNote && (
        <p role="status" data-testid="draft-link-note" className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {what} The link shows a 404 until you press Mark sent. Use the eye button to
            preview it.
          </span>
        </p>
      )}
      {localOnly && (
        <p data-testid="local-mode-note" className="text-muted-foreground">
          Local mode: this demo is saved only in this browser. Anyone else who opens the link sees a
          404 until Supabase is switched on.
        </p>
      )}
    </div>
  );
}
