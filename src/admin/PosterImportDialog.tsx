import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, Camera, FileImage, Loader2, ScanText, Sparkles, Upload, X } from "lucide-react";
import { chooseTemplate, normalizeExtract, type PosterAttempt, type PosterExtract } from "@/lib/ai/posterSchema";
import {
  PosterError, attemptLine, prepareImage, providerLabel, providerOrder, readPoster, type PreparedImage,
} from "@/lib/ai/posterClient";
import {
  dentalPosterTemplate, normalizeDentalExtract, posterLooksDental, toKind,
  type AnyPosterExtract, type AnyPosterKind, type PosterDraft,
} from "@/lib/ai/dentalPosterSchema";
import { templateMeta, type TemplateId } from "@/lib/demo/templates";
import { ReviewForm } from "./poster/ReviewForm";
import { TemplatePicker, primaryButton, secondaryButton, templateLabel, inputClass, type TemplateChoice } from "./poster/ui";

/** The poster kind a template stands for: school, coaching or (28 Sep 2026) a dental clinic. */
function posterKindOf(id: string | undefined): AnyPosterKind | undefined {
  return templateMeta(id)?.kind;
}

const KIND_WORD: Record<AnyPosterKind, string> = { school: "school", coaching: "coaching institute", dental: "dental clinic" };

/**
 * "Let AI choose", resolved. A clinic: dentalTemplateFor(clinic name,
 * treatments), the one rule the CRM and the Lead Finder use too, so the
 * reader's own suggestion is not consulted. A school or coaching poster: the
 * rules in chooseTemplate, with the reader's suggestion as the tie-break.
 */
function autoTemplate(x: PosterDraft, suggested?: TemplateId): TemplateId {
  return x.kind === "dental" ? dentalPosterTemplate(x) : chooseTemplate(x as PosterExtract, suggested);
}

/**
 * CREATE A DEMO FROM A POSTER, in three steps.
 *
 *   1. UPLOAD   drag and drop, the file picker, or the phone camera. Pick a
 *               template or let the AI choose; optionally type the name.
 *   2. READING  /api/poster tries the saved keys in the admin's order
 *               (Gemini first when it is saved first); the line names who is
 *               trying and who is next.
 *   3. REVIEW   the poster on one side, every field it read on the other,
 *               editable, empty ones visibly empty. "Create demo" builds the
 *               draft through fromPoster and opens it in the editor;
 *               "Fill manually instead" opens the ordinary Duplicate dialog.
 *
 * WHY THE REVIEW IS NOT OPTIONAL. A model reading a blurred phone photo will
 * sometimes turn a 6 into an 8 in a phone number or a fee. The demo carries
 * the institute's name to its own director, so nothing reaches a draft that
 * Mehdi has not seen. On every failure the same manual path is offered, so
 * a missing key or an exhausted free limit never stops the work.
 *
 * A DENTAL CLINIC (28 Sep 2026) takes the same three steps with its poster,
 * banner or visiting card. A dental template picked in step 1 tells the
 * reader it is a clinic; left to the AI, the reader decides. The review is
 * the clinic form (./poster/DentalReviewForm.tsx), which shows live what the
 * Dental Council code keeps off the demo; the template list has the seven
 * dental templates, and "Let AI choose" is dentalTemplateFor(clinic name,
 * treatments). Typing it in by hand works the same way for a clinic.
 *
 * The saving itself is the caller's (src/admin/poster/usePosterImport.ts),
 * so this file is only the conversation.
 */

type Step = "upload" | "reading" | "review" | "error";

export interface PosterReadMeta {
  provider: string;
  model: string;
  attempts: PosterAttempt[];
}

export function PosterImportDialog({
  initialTemplate, busy, error, onCancel, onCreate, onManual, addToCrmDefault = true,
}: {
  initialTemplate?: TemplateId;
  /** True while the caller saves the draft. */
  busy: boolean;
  /** The caller's save error, if any. */
  error: string | null;
  onCancel: () => void;
  /** `opts.addToCrm`: the review screen's "Also add to CRM" box. */
  onCreate: (templateId: TemplateId, extract: AnyPosterExtract, meta: PosterReadMeta, opts: { addToCrm: boolean }) => void;
  onManual: (templateId: TemplateId, known: { name?: string; city?: string; hiName?: string }) => void;
  /** Where "Also add to CRM" starts (the CRM setting "Add every new demo to the CRM"). */
  addToCrmDefault?: boolean;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [addToCrm, setAddToCrm] = useState(addToCrmDefault);
  useEffect(() => setAddToCrm(addToCrmDefault), [addToCrmDefault]);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [choice, setChoice] = useState<TemplateChoice>(initialTemplate || "auto");
  const [nameOverride, setNameOverride] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [readError, setReadError] = useState<{ message: string; attempts: PosterAttempt[] } | null>(null);
  const [extract, setExtract] = useState<PosterDraft | null>(null);
  const [meta, setMeta] = useState<PosterReadMeta | null>(null);
  const [suggested, setSuggested] = useState<TemplateId | undefined>();
  const [manualChoice, setManualChoice] = useState<TemplateId>(initialTemplate || "s1-urban-cbse");
  const [tried, setTried] = useState(false);
  const [dragging, setDragging] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  /* Each step moves focus to its heading, so a keyboard or screen-reader
     user hears where they are instead of being left on a vanished button. */
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => () => {
    abort.current?.abort();
    if (image) URL.revokeObjectURL(image.previewUrl);
  }, [image]);

  const resolved: TemplateId | null = useMemo(() => {
    if (choice !== "auto") return choice;
    return extract ? autoTemplate(extract, suggested) : null;
  }, [choice, extract, suggested]);

  const close = () => {
    if (busy) return;
    abort.current?.abort();
    onCancel();
  };

  async function takeFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setImage((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return prepared;
      });
    } catch (e) {
      setFileError((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  async function read() {
    if (!image) {
      setFileError("Choose a photo of the poster first.");
      return;
    }
    setStep("reading");
    setReadError(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    providerOrder().then((o) => !ctrl.signal.aborted && setOrder(o));
    const kind = choice === "auto" ? "auto" : posterKindOf(choice) || "auto";
    try {
      const r = await readPoster(image, { kind, templateHint: choice, signal: ctrl.signal });
      let x = { ...r.extracted } as PosterDraft;
      /* The template picked by hand fixes the kind. Left to the AI, a poster
         read as a school or coaching centre whose own name says dental is a
         clinic (the same looksDental test the CRM uses). The name typed in
         step 1 wins. */
      if (choice !== "auto") x = toKind(x, posterKindOf(choice) || x.kind);
      else if (x.kind !== "dental" && posterLooksDental(x)) x = toKind(x, "dental");
      if (nameOverride.trim()) x.instituteName = nameOverride.trim();
      setExtract(x);
      setSuggested(r.suggestedTemplate);
      setMeta({ provider: r.provider, model: r.model, attempts: r.attempts });
      setStep("review");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const pe = e instanceof PosterError ? e : null;
      setReadError({ message: (e as Error).message || "The poster could not be read.", attempts: pe?.attempts || [] });
      if (choice !== "auto") setManualChoice(choice);
      setStep("error");
    }
  }

  /** Start the review with nothing read: Mehdi types the poster in himself. */
  function typeItIn() {
    const kind = posterKindOf(manualChoice) || "coaching";
    setExtract({ kind, instituteName: nameOverride.trim() || undefined });
    setChoice(manualChoice);
    setMeta({ provider: "manual", model: "", attempts: readError?.attempts || [] });
    setStep("review");
  }

  function create() {
    if (!extract || !resolved || !meta) return;
    setTried(true);
    /* fromPoster converts to the template's family when the two differ. */
    const clean: AnyPosterExtract = extract.kind === "dental" ? normalizeDentalExtract(extract) : normalizeExtract(extract, extract.kind);
    if (!clean.instituteName && !clean.instituteNameHi) return;
    onCreate(resolved, clean, meta, { addToCrm });
  }

  const known = () => ({
    name: (extract?.instituteName || nameOverride).trim() || undefined,
    city: extract?.city?.trim() || undefined,
    hiName: extract?.instituteNameHi?.trim() || undefined,
  });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    takeFile(e.dataTransfer.files?.[0]);
  };

  const who = order[0] ? providerLabel(order[0]) : null;
  const next = order.slice(1).map(providerLabel);
  const nameMissing = tried && extract && !extract.instituteName?.trim() && !extract.instituteNameHi?.trim();
  const titles: Record<Step, string> = {
    upload: "Create a demo from a poster",
    reading: "Reading the poster",
    review: "Check what was read",
    error: readError ? "The poster was not read" : "Fill the demo by hand",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm sm:p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-title"
        className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col bg-background text-foreground shadow-2xl sm:min-h-0 sm:rounded-2xl sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && close()}
      >
        <div className="flex items-start gap-3 border-b border-border p-4 sm:p-6">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScanText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="poster-title" ref={heading} tabIndex={-1} className="font-display text-lg font-semibold outline-none">
              {titles[step]}
            </h2>
            <p className="text-xs text-muted-foreground">
              Step {step === "upload" ? 1 : step === "reading" ? 2 : 3} of 3
            </p>
          </div>
          <button type="button" onClick={close} disabled={busy} className="rounded-full p-2 hover:bg-muted disabled:opacity-50" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {step === "upload" && (
          <div className="grid gap-5 p-4 sm:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              A photo of their poster, pamphlet, hoarding or a clinic’s visiting card. The AI reads the name,
              courses or treatments, fees, teachers or doctors, results, timings and contact details, you check
              every field, and the demo is made from a template with those facts filled in. Anything not on the
              poster keeps the template’s own content, labelled as sample where it should be.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`grid place-items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
            >
              {image ? (
                <img src={image.previewUrl} alt="The poster you chose" className="max-h-56 w-auto rounded-lg border border-border object-contain" />
              ) : (
                <FileImage className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              )}
              <p className="text-sm">
                {preparing ? "Preparing the photo…" : image ? "Poster ready. Drop another to replace it." : "Drop the poster here"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className={secondaryButton} onClick={() => pickRef.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" /> Choose a file
                </button>
                <button type="button" className={secondaryButton} onClick={() => cameraRef.current?.click()}>
                  <Camera className="h-4 w-4" aria-hidden="true" /> Take a photo
                </button>
              </div>
              <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" aria-label="Choose a poster photo" data-testid="poster-file" onChange={(e) => takeFile(e.target.files?.[0])} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => takeFile(e.target.files?.[0])} />
              {fileError && (
                <p role="alert" className="flex gap-2 text-left text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {fileError}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TemplatePicker id="poster-template" value={choice} onChange={setChoice} />
              <div>
                <label htmlFor="poster-name" className="block text-sm font-medium">
                  {posterKindOf(choice === "auto" ? undefined : choice) === "dental" ? "Clinic name" : "Institute or clinic name"}{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input id="poster-name" className={inputClass} placeholder="Leave empty to use the poster’s" value={nameOverride} onChange={(e) => setNameOverride(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButton} disabled={!image || preparing} onClick={read}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Read the poster
              </button>
              {/* The template picked above carries over, as it does after a failed read. */}
              <button type="button" className={secondaryButton} onClick={() => { setReadError(null); if (choice !== "auto") setManualChoice(choice); setStep("error"); }}>
                Fill manually instead
              </button>
            </div>
          </div>
        )}

        {step === "reading" && (
          <div className="grid place-items-center gap-4 p-8 text-center" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="font-medium" data-testid="poster-reading">
              {who ? `Reading the poster with ${who}...` : "Reading the poster..."}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {next.length
                ? `If ${who} fails or has reached its limit, ${next.join(", then ")} ${next.length > 1 ? "are" : "is"} tried next.`
                : "This usually takes ten to thirty seconds."}
            </p>
            <button type="button" className={secondaryButton} onClick={() => { abort.current?.abort(); setStep("upload"); }}>
              Cancel
            </button>
          </div>
        )}

        {step === "error" && (
          <ErrorStep
            message={readError?.message || null}
            attempts={readError?.attempts || []}
            manualChoice={manualChoice}
            setManualChoice={setManualChoice}
            onManual={() => onManual(manualChoice, known())}
            onTypeIn={typeItIn}
            onRetry={image ? () => setStep("upload") : undefined}
          />
        )}

        {step === "review" && extract && meta && (
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="grid content-start gap-3 lg:sticky lg:top-4 lg:self-start">
              {image ? (
                <img src={image.previewUrl} alt="The poster being read" className="max-h-[40vh] w-full rounded-xl border border-border object-contain lg:max-h-[75vh]" />
              ) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No poster photo: type the details in.</p>
              )}
              <ReadSummary meta={meta} />
              <TemplatePicker
                id="poster-review-template"
                value={choice}
                onChange={setChoice}
                autoLabel={templateLabel(autoTemplate(extract, suggested))}
                label="Template for this demo"
              />
              {choice !== "auto" && templateMeta(choice)?.kind !== extract.kind && (
                <p className="text-xs text-muted-foreground">
                  The poster reads as a {KIND_WORD[extract.kind]}; this template is a {KIND_WORD[templateMeta(choice)?.kind || extract.kind]}.
                  That works: the template decides the pages, and the shared details (name, city, contact) carry over.
                </p>
              )}
            </div>

            <div className="grid min-w-0 content-start gap-4">
              <p className="text-sm text-muted-foreground">
                Empty boxes were not on the poster: the template’s own content stays there. Check phone numbers
                and fees digit by digit.
              </p>
              <ReviewForm x={extract} onChange={setExtract} />
            </div>

            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:col-span-2">
              {nameMissing && (
                <p role="alert" className="w-full text-sm text-destructive">Type the {extract.kind === "dental" ? "clinic" : "institute"}’s name. It is the one field a demo cannot be made without.</p>
              )}
              {error && (
                <p role="alert" className="flex w-full gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                </p>
              )}
              <button type="button" className={primaryButton} disabled={busy || !resolved} onClick={create}>
                {busy ? "Creating…" : `Create demo (${templateLabel(resolved || undefined)})`}
              </button>
              <button type="button" className={secondaryButton} disabled={busy || !resolved} onClick={() => resolved && onManual(resolved, known())}>
                Fill manually instead
              </button>
              {/* The demo is tracked in the CRM as a lead (or linked to the lead it already is). */}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" data-testid="poster-add-crm" checked={addToCrm} disabled={busy} onChange={(e) => setAddToCrm(e.target.checked)} />
                Also add to CRM
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Who read it, and who was tried first. */
function ReadSummary({ meta }: { meta: PosterReadMeta }) {
  if (meta.provider === "manual") return null;
  const fell = meta.attempts.filter((a) => a.status !== "ok" && a.status !== "skipped");
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs" data-testid="poster-read-summary">
      <p>
        Read by <strong>{providerLabel(meta.provider)}</strong>
        {meta.model ? ` (${meta.model})` : ""}.
      </p>
      {fell.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          {fell.map((a, i) => (
            <li key={i}>{attemptLine(a)}, so the next key was tried.</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Every failure lands here, and so does "Fill manually instead" from step 1.
 * Two ways on, both without the AI: the ordinary Duplicate dialog, or the
 * review form empty, to type the poster in field by field.
 */
function ErrorStep({
  message, attempts, manualChoice, setManualChoice, onManual, onTypeIn, onRetry,
}: {
  message: string | null;
  attempts: PosterAttempt[];
  manualChoice: TemplateId;
  setManualChoice: (id: TemplateId) => void;
  onManual: () => void;
  onTypeIn: () => void;
  onRetry?: () => void;
}) {
  const tried = attempts.filter((a) => a.status !== "skipped");
  return (
    <div className="grid gap-5 p-4 sm:p-6">
      {message && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p data-testid="poster-error">{message}</p>
            {tried.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                {tried.map((a, i) => (
                  <li key={i}>{attemptLine(a)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Pick the template and fill the demo by hand. Nothing is lost: the work does not depend on the AI.
      </p>
      <div className="max-w-md">
        <TemplatePicker
          id="poster-manual-template"
          label="Template"
          value={manualChoice}
          allowAuto={false}
          onChange={(v) => v !== "auto" && setManualChoice(v)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={primaryButton} onClick={onManual}>
          Fill manually instead
        </button>
        <button type="button" className={secondaryButton} onClick={onTypeIn}>
          Type the poster’s details into the form
        </button>
        {onRetry && (
          <button type="button" className={secondaryButton} onClick={onRetry}>
            Back to the poster
          </button>
        )}
      </div>
    </div>
  );
}
