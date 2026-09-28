import { useCallback } from "react";
import type { DemoSite, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { loadTemplate, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate, type DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";

/**
 * The same write as the Templates tab's Duplicate (useDuplicateTemplate.ts):
 * load the template's chunk, run it through fromTemplate with the institute's
 * name and city, save it as an ordinary DRAFT demoSites record. The one
 * difference: it does not open the editor, because the Lead Finder links the
 * new demo to the lead and stays on the list. Contact details start empty,
 * exactly as with Duplicate.
 */
export function useCreateDemo() {
  const { data, actions } = useCms();
  return useCallback(
    async (templateId: TemplateId, who: DuplicateIdentity): Promise<DemoSite> => {
      const template = await loadTemplate(templateId);
      if (!template) throw new Error(`There is no template called ${templateId}.`);
      const copy = fromTemplate(
        template,
        {
          sites: (data.demoSites as DemoSite[]) || [],
          pitchPages: (data.pitchPages as PitchPage[]) || [],
        },
        who,
      );
      await actions.saveDoc("demoSites", copy);
      return copy;
    },
    [actions, data.demoSites, data.pitchPages],
  );
}
