import { createElement, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DemoSite, PitchPage } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { loadTemplate, templateMeta, type TemplateId } from "@/lib/demo/templates";
import { fromTemplate, type DuplicateIdentity } from "@/lib/demo/templates/fromTemplate";
import { fromPoster, provenanceNote } from "@/lib/demo/templates/fromPoster";
import type { PosterExtract } from "@/lib/ai/posterSchema";
import { providerLabel } from "@/lib/ai/posterClient";
import { DuplicateTemplateDialog } from "@/admin/DuplicateTemplateDialog";
import { PosterImportDialog, type PosterReadMeta } from "@/admin/PosterImportDialog";
import { addDemoToCrm } from "@/lib/outreach/demoLead";
import { outreachStore } from "@/lib/outreach/store";

/**
 * THE POSTER IMPORT, WIRED IN. Shared by the Templates tab, the template
 * preview and the demo-sites list, so all three do exactly the same thing.
 *
 * `open(templateId?)` shows the poster dialog, preselecting a template when
 * it was opened from one. "Create demo" saves the draft the same way a
 * Duplicate does (loadTemplate, then a pure builder, then one saveDoc into
 * `demoSites`, then the editor), plus one private note on the demo's slot
 * saying which AI read the poster and which fields it filled.
 * "Fill manually instead" closes it and opens the ordinary Duplicate dialog,
 * prefilled with whatever name and city are already known, and makes the
 * copy exactly as useDuplicateTemplate does.
 *
 * Both paths also add the demo to the CRM as a lead, or link it to the
 * lead the institute already is (src/lib/outreach/demoLead.ts): the poster
 * review screen has its own "Also add to CRM" box, the manual path follows
 * the CRM setting "Add every new demo to the CRM". A failure there never
 * loses the demo.
 *
 * The caller renders `dialog`.
 */
export function usePosterImport() {
  const { data, actions } = useCms();
  const navigate = useNavigate();
  const [openFor, setOpenFor] = useState<{ template?: TemplateId } | null>(null);
  const [manual, setManual] = useState<{ id: TemplateId; known: Partial<DuplicateIdentity> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crmDefault, setCrmDefault] = useState(true);

  /* Where the poster screen's "Also add to CRM" starts: the CRM setting. */
  useEffect(() => {
    if (!openFor) return;
    let live = true;
    outreachStore
      .getSettings()
      .then((s) => live && setCrmDefault(s.autoAddDemos !== false))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [openFor]);

  /* The plain Duplicate, as useDuplicateTemplate does it, but closing THIS
     dialog on success: on the demo-sites list the page does not change when
     the editor opens, so the dialog would otherwise stay on screen. */
  const duplicateManually = useCallback(
    async (id: TemplateId, who: DuplicateIdentity) => {
      setBusy(true);
      setError(null);
      try {
        const template = await loadTemplate(id);
        if (!template) throw new Error(`There is no template called ${id}.`);
        const copy = fromTemplate(
          template,
          { sites: (data.demoSites as DemoSite[]) || [], pitchPages: (data.pitchPages as PitchPage[]) || [] },
          who,
        );
        await actions.saveDoc("demoSites", copy);
        await addDemoToCrm(copy, "template").catch((e) => console.warn("Demo saved, but not added to the CRM:", e));
        setManual(null);
        navigate(`/admin/c/demoSites?edit=${encodeURIComponent(copy.id)}`);
      } catch (e) {
        setError(`The copy was not made: ${(e as Error).message || "unknown error"}. Nothing was saved.`);
      } finally {
        setBusy(false);
      }
    },
    [actions, data.demoSites, data.pitchPages, navigate],
  );

  const create = useCallback(
    async (id: TemplateId, extract: PosterExtract, meta: PosterReadMeta, opts?: { addToCrm: boolean }) => {
      setBusy(true);
      setError(null);
      try {
        const template = await loadTemplate(id);
        if (!template) throw new Error(`There is no template called ${id}.`);
        const { site, provenance } = fromPoster(
          template,
          {
            sites: (data.demoSites as DemoSite[]) || [],
            pitchPages: (data.pitchPages as PitchPage[]) || [],
          },
          extract,
          { provider: meta.provider, model: meta.model },
        );
        await actions.saveDoc("demoSites", site);
        /* The provenance goes on the PRIVATE slot: demoSites is world-readable,
           and which AI read the poster is nobody's business but Mehdi's. A
           failure here must not lose the demo that was just saved. */
        try {
          await actions.saveDoc("demoSiteSlots", {
            id: site.id,
            internalNotes: provenanceNote(provenance, providerLabel(provenance.provider)),
            poster: provenance,
          });
        } catch {
          /* The demo exists; only the note is missing. */
        }
        await addDemoToCrm(site, "poster", { force: opts ? opts.addToCrm : undefined }).catch((e) =>
          console.warn("Demo saved, but not added to the CRM:", e),
        );
        setOpenFor(null);
        navigate(`/admin/c/demoSites?edit=${encodeURIComponent(site.id)}`);
      } catch (e) {
        setError(`The demo was not made: ${(e as Error).message || "unknown error"}. Nothing was saved.`);
      } finally {
        setBusy(false);
      }
    },
    [actions, data.demoSites, data.pitchPages, navigate],
  );

  const open = useCallback((template?: TemplateId) => {
    setError(null);
    setManual(null);
    setOpenFor({ template });
  }, []);

  let dialog = null;
  if (openFor) {
    dialog = createElement(PosterImportDialog, {
      initialTemplate: openFor.template,
      busy,
      error,
      onCancel: () => setOpenFor(null),
      onCreate: create,
      addToCrmDefault: crmDefault,
      onManual: (id: TemplateId, known: Partial<DuplicateIdentity>) => {
        setOpenFor(null);
        setError(null);
        setManual({ id, known });
      },
    });
  } else if (manual) {
    dialog = createElement(DuplicateTemplateDialog, {
      templateLabel: templateMeta(manual.id)?.label || manual.id,
      busy,
      error,
      initial: manual.known,
      onCancel: () => setManual(null),
      onSubmit: (who: DuplicateIdentity) => duplicateManually(manual.id, who),
    });
  }

  return { open, dialog };
}
