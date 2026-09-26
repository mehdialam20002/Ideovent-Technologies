import { useMemo, useState } from "react";
import {
  Archive, AlertTriangle, Check, Copy, ExternalLink, Files, Pencil, Plus, Save, Send, Trash2, X,
} from "lucide-react";
import type { PitchPage, PitchPageNote } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { nextId, sortByOrder } from "@/lib/cms/store";
import { PITCH_SLUG_MAX, pitchPackage, pitchSlugify, pitchPageUrl } from "@/lib/pitch/record";
/* Imported straight from the guard, not through ./record or ./index: this
   module carries the text of App.tsx and vercel.json so that the reserved list
   is the real route table, and the admin is the only thing that needs it. See
   the note at the top of ./record. */
import { pitchSlugIssue, uniquePitchSlug } from "@/lib/pitch/reservedRoutes";
import { AdminField } from "./fields";
import type { CollectionSchema } from "./schemas";
import { cn } from "@/lib/utils";

/**
 * The pitch-page editor.
 *
 * Its own screen rather than the generic CollectionEditor, because this
 * collection is the only one whose documents are sent to a named stranger, one
 * at a time, from a phone. That changes what the list has to do:
 *
 *   SLUG. It is generated from the institute's name and checked against the
 *   real route table before it can be saved. A pitch page that silently shadows
 *   /pricing does not look broken to anybody: the admin says it saved, the link
 *   goes into WhatsApp, and the director opens the Ideovent price list. So the
 *   check is in the way, not in a warning at the bottom of the form.
 *
 *   COPY LINK. The thing Mehdi does after every save is paste the address into
 *   WhatsApp, so the list hands him the full https:// address rather than
 *   asking him to assemble it. Built from the canonical host in Site Settings,
 *   which is where every other absolute URL on the site comes from.
 *
 *   DUPLICATE. The second pitch is the first one with a different name on it.
 *   Duplicating copies everything except the slug, the status and the internal
 *   note, and drops the copy into draft so it cannot go out half-edited.
 *
 *   STATUS. Only `live` resolves. Draft and archived render the ordinary 404,
 *   so the row's "Open" link is disabled until the page is live; offering a
 *   link that 404s would teach Mehdi to distrust the button.
 *
 * The FORM is the schema in ./schemas.ts, rendered with the same AdminField as
 * every other collection, so a field added there appears here with no work.
 */

const STATUS_STYLES: Record<PitchPage["status"], string> = {
  draft: "border-border text-muted-foreground",
  live: "border-success/40 text-success",
  archived: "border-warning/40 text-warning",
};

const STATUS_LABEL: Record<PitchPage["status"], string> = {
  draft: "Draft",
  live: "Live",
  archived: "Archived",
};

export function PitchPagesEditor({ schema }: { schema: CollectionSchema }) {
  const { data, actions, mode } = useCms();
  /**
   * TRUE when the site has no Supabase project wired to it, so the CMS is
   * running on LocalStore and every document lives in THIS browser's
   * localStorage and nowhere else.
   *
   * It matters more here than on any other collection. Everywhere else, local
   * mode means an edit does not reach the live site, which is annoying and
   * obvious. Here it means the one thing this screen exists to do fails
   * silently in exactly the way the slug guard was written to prevent: Mehdi
   * creates a page, the admin says it saved, "Copy link" hands him a real
   * https:// address, he pastes it into WhatsApp, and the principal opens the
   * site's 404, because the record never left his laptop. Nobody sees it
   * happen. So the screen says so, at the top, before the list.
   */
  const localOnly = mode !== "supabase";
  const pages = sortByOrder((data.pitchPages as PitchPage[]) || []) as PitchPage[];
  const notes = (data.pitchPageNotes as PitchPageNote[]) || [];
  const host = data.settings?.defaultSeo?.canonicalHost || "";

  const [editing, setEditing] = useState<PitchPage | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isNew = editing ? !pages.some((p) => p.id === editing.id) : false;
  const slugError = editing
    ? pitchSlugIssue(editing.slug, { pages, currentId: editing.id })
    : null;
  const nameError = editing && !(editing.instituteName || "").trim()
    ? "An institute name is required. It is the heading of their page."
    : null;

  const pkg = useMemo(() => (editing ? pitchPackage(editing) : null), [editing]);

  const open = (page: PitchPage) => {
    setEditing({ ...page });
    setDraftNote(notes.find((n) => n.id === page.id)?.note || "");
  };

  const startNew = () => {
    setEditing(schema.defaults() as PitchPage);
    setDraftNote("");
  };

  /** Everything except the slug, the status and the note. See the header. */
  const duplicate = async (page: PitchPage) => {
    const copy: PitchPage = {
      ...page,
      id: nextId("pp"),
      status: "draft",
      isExample: false,
      instituteName: `${page.instituteName} (copy)`,
      slug: "",
      order: pages.length,
    };
    copy.slug = uniquePitchSlug(copy.instituteName, { pages, currentId: copy.id });
    setEditing(copy);
    setDraftNote("");
  };

  const save = async () => {
    if (!editing || slugError || nameError) return;
    setSaving(true);
    try {
      await actions.saveDoc("pitchPages", editing);
      // The note is a separate document in an admin-only collection, so it is
      // saved separately. See PitchPageNote in src/lib/cms/types.ts.
      const existing = notes.find((n) => n.id === editing.id);
      if (draftNote.trim() || existing) {
        await actions.saveDoc("pitchPageNotes", { id: editing.id, note: draftNote });
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (page: PitchPage, status: PitchPage["status"]) => {
    await actions.saveDoc("pitchPages", { ...page, status });
  };

  const remove = async (page: PitchPage) => {
    if (!confirm(`Delete the pitch page for ${page.instituteName}? This cannot be undone.`)) return;
    await actions.removeDoc("pitchPages", page.id);
    if (notes.some((n) => n.id === page.id)) await actions.removeDoc("pitchPageNotes", page.id);
  };

  const copyLink = async (page: PitchPage) => {
    const url = pitchPageUrl(page.slug, host);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(page.id);
      window.setTimeout(() => setCopied((c) => (c === page.id ? null : c)), 2000);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. A prompt is ugly and it always works.
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Pitch pages</h1>
            <p className="text-sm text-muted-foreground">
              {pages.length} {pages.length === 1 ? "page" : "pages"} ·{" "}
              {pages.filter((p) => p.status === "live").length} live
            </p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> New pitch page
        </button>
      </div>

      {localOnly && (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">
              Do not send these links yet. This site has no database connected.
            </p>
            <p className="mt-1 text-muted-foreground">
              Every pitch page you make here is saved in <strong className="text-foreground">this
              browser only</strong>. It is not on the live site, so the link below will open the
              ordinary 404 for the institute, on their phone, with nothing to tell you it did.
              Clearing this browser’s data deletes the pages too.
            </p>
            <p className="mt-2 text-muted-foreground">
              To fix it, set <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> in Vercel, run
              the migrations in <code className="rounded bg-muted px-1">supabase/migrations/</code>{" "}
              (including <code className="rounded bg-muted px-1">0003_pitch_pages.sql</code>, which
              is what keeps the internal notes private), and redeploy. See SUPABASE_SETUP.md.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How these work</p>
        <p className="mt-1">
          One page per institute, at <code className="rounded bg-muted px-1">/their-name</code>. Only a
          page set to <strong className="text-foreground">Live</strong> opens: a draft or an archived
          one shows the ordinary 404, so nothing half-written can be read by someone who guesses the
          name. Every pitch page sets{" "}
          <code className="rounded bg-muted px-1">noindex, nofollow</code>, so it stays out of search
          results. It is private, not secret: anyone with the link can open it.
        </p>
        <p className="mt-2">
          <strong className="text-foreground">Send the /pitch/ link, not the short one.</strong> Both
          addresses open the same page, and{" "}
          <code className="rounded bg-muted px-1">/pitch/their-name</code> is the one the host also
          protects with a real <code className="rounded bg-muted px-1">X-Robots-Tag</code> HTTP
          header. The short <code className="rounded bg-muted px-1">/their-name</code> form sets
          noindex from JavaScript only, which every search engine obeys but a crawler that does not
          run JavaScript never sees. Use the short one when you are handing the link over in person
          and it has to be typed; use the /pitch/ one for anything that gets forwarded.
        </p>
        <p className="mt-2">
          Never put a phone number, an email or a postal address for the institute on a record. There
          is no field for one on purpose. This collection is readable by anyone who opens the page,
          and a number that was guessed rather than read belongs to a real stranger who then gets the
          call.
        </p>
      </div>

      <div className="space-y-2">
        {pages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No pitch pages yet. Click "New pitch page".
          </div>
        )}

        {pages.map((page) => {
          const url = pitchPageUrl(page.slug, host);
          const place = [page.city, page.state].filter(Boolean).join(", ");
          const issue = pitchSlugIssue(page.slug, { pages, currentId: page.id });
          return (
            <div key={page.id} className="rounded-2xl border border-border bg-card/60 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{page.instituteName || "Untitled"}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        STATUS_STYLES[page.status] || STATUS_STYLES.draft,
                      )}
                    >
                      {STATUS_LABEL[page.status] || page.status}
                    </span>
                    {page.isExample && (
                      <span className="shrink-0 rounded-full border border-warning/40 px-2 py-0.5 text-[11px] font-medium text-warning">
                        Example, delete me
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    <code className="rounded bg-muted px-1">/{page.slug}</code>
                    {place ? ` · ${place}` : ""}
                    {page.market === "international" ? " · International" : ""}
                  </p>
                  {issue && <p className="mt-1 text-xs text-destructive">{issue}</p>}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyLink(page)}
                    aria-label={`Copy the link for ${page.instituteName}`}
                    title={url}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"
                  >
                    {copied === page.id ? (
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">{copied === page.id ? "Copied" : "Copy link"}</span>
                  </button>

                  {page.status === "live" ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open the pitch page for ${page.instituteName} in a new tab`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span
                      title="Set it live first. A draft or archived page shows the 404."
                      aria-label="Preview unavailable until this page is live"
                      className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-border opacity-40"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}

                  {page.status === "live" ? (
                    <button
                      type="button"
                      onClick={() => setStatus(page, "archived")}
                      aria-label={`Archive the pitch page for ${page.instituteName}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-warning/50"
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Archive</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus(page, "live")}
                      aria-label={`Set the pitch page for ${page.instituteName} live`}
                      disabled={Boolean(issue)}
                      title={issue || undefined}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-success/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Set live</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => duplicate(page)}
                    aria-label={`Duplicate the pitch page for ${page.instituteName}`}
                    title="Duplicate"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                  >
                    <Files className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => open(page)}
                    aria-label={`Edit the pitch page for ${page.instituteName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(page)}
                    aria-label={`Delete the pitch page for ${page.instituteName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                {isNew ? "New" : "Edit"} pitch page
              </h2>
              <button
                type="button"
                aria-label="Close the editor"
                onClick={() => setEditing(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {editing.isExample && (
              <div className="mb-5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="font-medium">This is the example record. Delete it.</p>
                <p className="mt-1 text-muted-foreground">
                  Example Public School does not exist, and its "measurements" say so on the page. It
                  ships with the site so the route can be opened and the two designs have something to
                  render. Once a real pitch page is live, delete this one.
                </p>
              </div>
            )}

            {/* ── Name and slug. Rendered here rather than from the schema,
                because the two are wired together and the slug is validated
                against the real route table. ────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <AdminField
                  field={schema.fields[0]}
                  value={editing.instituteName}
                  onChange={(v) => {
                    // The slug follows the name only while it has not been
                    // hand-edited and the page is not live yet: changing the
                    // address of a page whose link is already in somebody's
                    // WhatsApp would break it silently.
                    const wasAuto = !editing.slug || editing.slug === pitchSlugify(editing.instituteName);
                    const next: PitchPage = { ...editing, instituteName: v };
                    if (wasAuto && editing.status !== "live") {
                      next.slug = uniquePitchSlug(v, { pages, currentId: editing.id });
                    }
                    setEditing(next);
                  }}
                />
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="pitch-slug" className="text-sm font-medium">
                  Link
                </label>
                <p className="text-xs text-muted-foreground">
                  Generated from the name. Edit it if you want, but every real page on this site wins
                  its own address, so a slug that matches one is refused here rather than failing
                  quietly when you send it.
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="shrink-0 text-sm text-muted-foreground">/</span>
                  <input
                    id="pitch-slug"
                    className={cn(
                      "w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      slugError ? "border-destructive" : "border-input focus:border-primary",
                    )}
                    value={editing.slug}
                    maxLength={PITCH_SLUG_MAX}
                    aria-invalid={Boolean(slugError)}
                    aria-describedby={slugError ? "pitch-slug-error" : undefined}
                    onChange={(e) => setEditing({ ...editing, slug: pitchSlugify(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        slug: uniquePitchSlug(editing.instituteName, { pages, currentId: editing.id }),
                      })
                    }
                    className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border px-2.5 text-xs hover:border-primary/50"
                  >
                    From name
                  </button>
                </div>
                {slugError ? (
                  <p id="pitch-slug-error" className="mt-1 text-xs text-destructive">
                    {slugError}
                  </p>
                ) : (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {pitchPageUrl(editing.slug, host)}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="pitch-status" className="text-sm font-medium">
                  Status
                </label>
                <p className="text-xs text-muted-foreground">
                  Only Live opens. Draft and Archived both show the ordinary 404.
                </p>
                <select
                  id="pitch-status"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as PitchPage["status"] })}
                >
                  <option value="draft">Draft, only you can see it</option>
                  <option value="live">Live, the link works</option>
                  <option value="archived">Archived, the link stops working</option>
                </select>
              </div>

              {/* The rest of the form, straight from the schema. */}
              {schema.fields.slice(1).map((f) => (
                <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                  <AdminField
                    field={f}
                    value={(editing as any)[f.name]}
                    onChange={(v) => setEditing({ ...editing, [f.name]: v } as PitchPage)}
                  />
                  {f.name === "recommendedPackage" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pkg
                        ? `The page will print: ${pkg.label}, ${pkg.range}${pkg.timeline ? `, ${pkg.timeline}` : ""}.`
                        : editing.recommendedPackage
                          ? "That package belongs to the other market, so the page will print no price at all. Change the Market field or pick another package."
                          : "No package chosen, so the page prints no price. That is a supported state."}
                    </p>
                  )}
                </div>
              ))}

              <div className="sm:col-span-2">
                <label htmlFor="pitch-note" className="text-sm font-medium">
                  Internal note
                </label>
                <p className="text-xs text-muted-foreground">
                  Never rendered, and never published: it is stored in an admin-only collection, not
                  on the page’s own record. Who to chase, what was said, what is still unverified.
                </p>
                <textarea
                  id="pitch-note"
                  className="mt-1.5 min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                />
              </div>
            </div>

            <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 bg-background pt-4">
              <button
                onClick={save}
                disabled={saving || Boolean(slugError) || Boolean(nameError)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PitchPagesEditor;
