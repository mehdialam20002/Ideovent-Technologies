import { createElement, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DemoSite, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { loadTemplate, templateMeta, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate, type DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";
import { DuplicateTemplateDialog } from "./DuplicateTemplateDialog";
import { addDemoToCrm } from "@/lib/outreach/demoLead";

/**
 * THE ONE WRITE A TEMPLATE ALLOWS: make a new draft demo from it.
 *
 * Shared by the Templates tab and the template preview, so both do exactly
 * the same thing. `request(id)` opens a small dialog asking for the
 * institute's name (required), city and Hindi name; submitting it loads the
 * template's own chunk, runs it through `fromTemplate` (which carries the
 * whole template under the new name and clears the contact details), saves
 * the result as an ordinary `demoSites` draft, and opens it in the
 * demo-sites editor.
 *
 * Nothing here can write to a template. Templates are modules; the only
 * document this touches is the new copy. The caller renders `dialog`.
 */
export function useDuplicateTemplate() {
  const { data, actions } = useCms();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<TemplateId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<TemplateId | null>(null);

  const duplicate = useCallback(
    async (id: TemplateId, who: DuplicateIdentity) => {
      setBusy(id);
      setError(null);
      try {
        const template = await loadTemplate(id);
        if (!template) throw new Error(`There is no template called ${id}.`);
        const copy = fromTemplate(
          template,
          {
            sites: (data.demoSites as DemoSite[]) || [],
            pitchPages: (data.pitchPages as PitchPage[]) || [],
          },
          who,
        );
        await actions.saveDoc("demoSites", copy);
        /* Track it in the CRM: a new lead, or linked to the lead it already is.
           Follows the CRM setting "Add every new demo to the CRM" (on unless
           turned off). A failure here never loses the demo. */
        await addDemoToCrm(copy, "template").catch((e) => console.warn("Demo saved, but not added to the CRM:", e));
        setAsking(null);
        navigate(`/admin/c/demoSites?edit=${encodeURIComponent(copy.id)}`);
      } catch (e) {
        setError(
          `The copy was not made: ${(e as Error).message || "unknown error"}. Nothing was saved.`,
        );
      } finally {
        setBusy(null);
      }
    },
    [actions, data.demoSites, data.pitchPages, navigate],
  );

  const request = useCallback((id: TemplateId) => {
    setError(null);
    setAsking(id);
  }, []);

  const meta = asking ? templateMeta(asking) : undefined;
  const dialog = asking
    ? createElement(DuplicateTemplateDialog, {
        templateLabel: meta?.label || asking,
        kind: meta?.kind,
        busy: busy !== null,
        error,
        onCancel: () => setAsking(null),
        onSubmit: (who: DuplicateIdentity) => duplicate(asking, who),
      })
    : null;

  return { request, duplicate, busy, error, dialog };
}
