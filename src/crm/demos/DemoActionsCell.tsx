import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Link2, MoreHorizontal, PencilLine, Send, UserPlus } from "lucide-react";
import { demoPreviewPath } from "@/lib/demo/record";
import { teamDemoUrl } from "@/lib/demo/opens";
import { mainSiteUrl } from "@/lib/host";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { crm } from "../ui";
import { cn } from "@/lib/utils";
import type { DemoItem } from "./model";
import type { DemoLeadMode } from "./DemoLeadDialog";

export interface RowHandlers {
  onCopy: (i: DemoItem) => Promise<boolean>;
  onMarkSent: (i: DemoItem) => Promise<void>;
  onLead: (i: DemoItem, mode: DemoLeadMode) => void;
}

/**
 * The actions on one demo: the one that matters most as a visible button
 * (Create lead when it has none, else Mark sent while it is a draft), Copy
 * link beside it, and the rest in a menu. The same cell serves the table
 * and the phone cards.
 *
 * Copy link copies the plain link, the one a prospect is sent. Open live
 * link (a sent demo only: nothing else opens there) is a TEAM PREVIEW
 * (`teamDemoUrl`, ?team=1), so looking at the page from here never counts
 * as the prospect's open.
 */
export function DemoActionsCell({ item, h, compact }: { item: DemoItem; h: RowHandlers; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const { demo, lead } = item;
  const canSend = item.status !== "sent" && item.status !== "closed";
  const live = item.status === "sent";

  const copy = async () => {
    const ok = await h.onCopy(item);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 1600);
  };
  const markSent = async () => {
    setBusy(true);
    try {
      await h.onMarkSent(item);
    } finally {
      setBusy(false);
    }
  };
  const btn = compact ? cn(crm.btn, "h-11 sm:h-9") : cn(crm.btn, "h-8 px-2.5");

  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {!lead ? (
        <button type="button" className={cn(btn, "border-primary/40 text-primary")} onClick={() => h.onLead(item, "create")} data-testid="demo-create-lead-btn">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Create lead
        </button>
      ) : canSend ? (
        <button type="button" className={btn} disabled={busy} onClick={() => void markSent()} title="The link only works once the demo is marked sent">
          <Send className="h-4 w-4" aria-hidden="true" /> {busy ? "Saving..." : "Mark sent"}
        </button>
      ) : null}
      <button type="button" className={btn} onClick={() => void copy()} aria-label={`Copy link to /site/${demo.slug}`}>
        {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        <span className={compact ? "" : "sr-only"}>{copied ? "Copied" : "Copy link"}</span>
      </button>
      {/* Not modal: its items open the Create / Link dialog, and a modal menu
          closing under a modal dialog left pointer-events:none on <body>, so
          the whole page stopped taking clicks after "Link to lead". */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(btn, "px-2")} aria-label={`More actions for ${demo.instituteName}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 text-[13px]">
          {/* These pages live on the main site: mainSiteUrl keeps them relative today and makes them
              absolute once the CRM is on its own subdomain. A plain <a> works either way. */}
          <DropdownMenuItem asChild>
            <a href={mainSiteUrl(demoPreviewPath(demo.slug))} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Open demo</a>
          </DropdownMenuItem>
          {live && (
            <DropdownMenuItem asChild>
              <a href={teamDemoUrl(demo.slug)} target="_blank" rel="noopener noreferrer" data-testid="demo-open-live"
                title="The page the prospect gets. Opening it from here never counts as their open.">
                <Globe className="mr-2 h-4 w-4" aria-hidden="true" /> Open live link
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <a href={mainSiteUrl(`/admin/c/demoSites?edit=${encodeURIComponent(demo.id)}`)} target="_blank" rel="noopener noreferrer"><PencilLine className="mr-2 h-4 w-4" aria-hidden="true" /> Edit in admin</a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {canSend && (
            <DropdownMenuItem onSelect={() => void markSent()}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Mark sent
            </DropdownMenuItem>
          )}
          {!lead && (
            <DropdownMenuItem onSelect={() => h.onLead(item, "create")}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Create lead
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => h.onLead(item, "link")}>
            <Link2 className="mr-2 h-4 w-4" aria-hidden="true" /> {lead ? "Link to another lead" : "Link to lead"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
