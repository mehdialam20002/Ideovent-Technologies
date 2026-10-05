import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Check, ImageOff } from "lucide-react";
import type { PreviewPage } from "@/lib/outreach/preview";
import { cn } from "@/lib/utils";
import { inputCls } from "./ui";
import { suggestionsFor, type Piece } from "./placeholders";
import { CreativeCard } from "./CreativeCard";

/** The picture under a first WhatsApp (CreativeCard), and what Share needs. */
export interface MessagePicture {
  page: PreviewPage;
  shareBlocked: boolean;
  onShared: () => void;
}

/**
 * The message as it will be sent, merge fields already filled for this lead,
 * and editable. Every [blank] in it is highlighted where it stands (amber
 * until filled, green once filled here), and a box below offers one field per
 * blank; what is typed there goes into the text. The highlight is a layer
 * under a transparent textarea with the same font, padding and wrapping; the
 * textarea grows with its text, so it never scrolls and the two never drift.
 *
 * Under a first WhatsApp that carries the picture link, the picture itself
 * (1 Oct 2026): `picture`, with Copy image, Share and Download. Under the twin
 * that offers to make a sample, `pictureNote` says why it has none.
 */
export function MessageBox({ isEmail, subject, body, pieces, blanks, fills, onSubject, onBody, onFill, now, picture, pictureNote, suggest = suggestionsFor }: {
  isEmail: boolean;
  subject: string;
  body: string;
  /** The body in pieces (text, blank, filled): what the highlight layer draws. */
  pieces: Piece[];
  /** Every blank the message had before filling, so a field stays while it is typed into. */
  blanks: string[];
  fills: Record<string, string>;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
  onFill: (name: string, value: string) => void;
  now: Date;
  /** The picture that goes with this message: a first WhatsApp with the picture link. */
  picture?: MessagePicture | null;
  /** Why this message has no picture, when its kind has one (the twin that offers to make a sample). */
  pictureNote?: string;
  /**
   * What a blank's box offers. Default: the lead page's suggestions (placeholders.ts suggestionsFor). The client
   * file passes its own (compose.ts clientSuggestionsFor): the project's figures, never a price list.
   */
  suggest?: (name: string, now: Date) => string[];
}) {
  const left = blanks.filter((b) => !(fills[b] ?? "").trim());
  return (
    <div className="mt-4 space-y-3">
      {isEmail && (
        <div>
          <label htmlFor="msg-subject" className="block text-sm font-medium">Subject</label>
          <input id="msg-subject" className={inputCls} value={subject} onChange={(e) => onSubject(e.target.value)} />
        </div>
      )}
      <div>
        <label htmlFor="msg-body" className="block text-sm font-medium">
          {isEmail ? "Email" : "WhatsApp message"} <span className="font-normal text-muted-foreground">(filled in for this lead; you can edit it)</span>
        </label>
        <HighlightedText id="msg-body" label="Message text" value={body} pieces={pieces} minRows={isEmail ? 12 : 8} onChange={onBody} />
      </div>

      {blanks.length > 0 && (
        <div data-testid="fill-blanks" className={cn("rounded-xl border p-3", left.length ? "border-warning/60 bg-warning/10" : "border-success/40 bg-success/10")}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {left.length ? "Fill in before sending" : <><Check className="h-4 w-4 text-success" aria-hidden="true" /> Every blank is filled</>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The highlighted [blanks] in the message. What you type here goes into the text; send stays off until each one is filled.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {blanks.map((name, i) => {
              const id = `blank-${i}`;
              const options = suggest(name, now);
              const done = Boolean((fills[name] ?? "").trim());
              return (
                <div key={name}>
                  <label htmlFor={id} className="flex items-center gap-1.5 text-sm">
                    [{name}] {done && <Check className="h-3.5 w-3.5 text-success" aria-label="filled" />}
                  </label>
                  <input id={id} data-blank={name} className={inputCls} value={fills[name] ?? ""} autoComplete="off"
                    list={options.length ? `${id}-options` : undefined}
                    placeholder={options.length ? `For example: ${options[0]}` : "Type it here"}
                    onChange={(e) => onFill(name, e.target.value)} />
                  {options.length > 0 && (
                    <datalist id={`${id}-options`}>{options.map((o) => <option key={o} value={o} />)}</datalist>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {picture && <CreativeCard page={picture.page} text={body} shareBlocked={picture.shareBlocked} onShared={picture.onShared} />}
      {!picture && pictureNote && (
        <p className="flex gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground" data-testid="creative-none">
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{pictureNote}</span>
        </p>
      )}
    </div>
  );
}

/* Same box for the layer and the textarea, so both wrap every line at the same place. */
const BOX_TEXT = "w-full whitespace-pre-wrap break-words px-3 py-2.5 text-base leading-relaxed sm:text-sm";

function HighlightedText({ id, label, value, pieces, minRows, onChange }: {
  id: string;
  label: string;
  value: string;
  pieces: Piece[];
  minRows: number;
  onChange: (v: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(() => {
    fit();
  }, [value, fit]);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);
  const marked = pieces.some((p) => p.kind !== "text");

  return (
    <div className="relative mt-1.5 rounded-xl border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      {marked && (
        <div ref={layer} aria-hidden="true" data-testid="message-marks" className={cn(BOX_TEXT, "pointer-events-none absolute inset-0 overflow-hidden text-transparent")}>
          {pieces.map((p, i) =>
            p.kind === "text" ? (
              <span key={i}>{p.text}</span>
            ) : (
              <mark key={i} data-mark={p.kind} className={cn("rounded-sm text-transparent", p.kind === "blank" ? "bg-warning/45" : "bg-success/25")}>{p.text}</mark>
            ),
          )}
          {"​"}
        </div>
      )}
      <textarea ref={area} id={id} aria-label={label} rows={minRows} value={value} spellCheck
        onChange={(e) => onChange(e.target.value)}
        onScroll={() => {
          if (layer.current && area.current) layer.current.scrollTop = area.current.scrollTop;
        }}
        className={cn(BOX_TEXT, "relative block resize-none overflow-hidden bg-transparent outline-none")} />
    </div>
  );
}
