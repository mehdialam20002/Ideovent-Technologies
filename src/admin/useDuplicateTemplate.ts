import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DemoSite, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { loadTemplate, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate } from "@/lib/demo/templates/fromTemplate";

/**
 * THE ONE WRITE A TEMPLATE ALLOWS: make a new draft demo from it.
 *
 * Shared by the Templates tab and the template preview, so both do exactly
 * the same thing. Loads the template's own chunk, runs it through
 * `fromTemplate` (which clears every fact about the fictional institute),
 * saves the result as an ordinary `demoSites` document, and opens it in the
 * demo-sites editor, because the next thing that happens is always typing
 * the real institute's name.
 *
 * Nothing here can write to a template. Templates are modules; the only
 * document this touches is the new copy.
 */
export function useDuplicateTemplate() {
  const { data, actions } = useCms();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<TemplateId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const duplicate = useCallback(
    async (id: TemplateId) => {
      setBusy(id);
      setError(null);
      try {
        const template = await loadTemplate(id);
        if (!template) throw new Error(`There is no template called ${id}.`);
        const copy = fromTemplate(template, {
          sites: (data.demoSites as DemoSite[]) || [],
          pitchPages: (data.pitchPages as PitchPage[]) || [],
        });
        await actions.saveDoc("demoSites", copy);
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

  return { duplicate, busy, error };
}
