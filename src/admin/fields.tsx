import { useId, useState } from "react";
import { Plus, Trash2, Upload, X, GripVertical } from "lucide-react";
import { uploadImage } from "@/lib/cms/upload";
import { cn } from "@/lib/utils";

export type FieldType =
  | "text" | "textarea" | "richtext" | "image" | "number" | "boolean"
  | "select" | "tags" | "stringlist" | "array" | "group";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
  itemFields?: FieldConfig[]; // for type "array" (list of objects)
  fields?: FieldConfig[]; // for type "group" (nested object)
  full?: boolean;
}

/*
  `outline-none` is a real class and beats the zero-specificity: where() focus rule
  in index.css, so every CMS field used to lose the baseline ring and signal focus
  with a border colour alone. The focus-visible ring puts it back.
*/
const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors " +
  "focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/*
  Every CMS label used to be a bare <label> with no `for`, so none of them was
  attached to anything: a screen reader announced each field as an unlabelled
  edit box and clicking the label did not focus the control. `htmlFor` + the
  generated id fixes both, and the help line is wired up with aria-describedby
  so it is read after the name rather than not at all.

  `as="span"` is for the composite controls (tags, lists, arrays, groups), which
  are several inputs rather than one and so are labelled with aria-labelledby on
  a role="group" wrapper instead: a <label> may only point at one control.
*/
function Label({
  children,
  help,
  htmlFor,
  id,
  helpId,
  as = "label",
}: {
  children: React.ReactNode;
  help?: string;
  htmlFor?: string;
  id?: string;
  helpId?: string;
  as?: "label" | "span";
}) {
  const Tag = as;
  return (
    <div className="mb-1.5">
      <Tag className="text-sm font-medium" id={id} {...(as === "label" ? { htmlFor }: {})}>
        {children}
      </Tag>
      {help && (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
)}
    </div>
);
}

export function ImageInput({
  value,
  onChange,
  id,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  describedBy?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
): (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
          <Upload className="h-4 w-4" />
        </div>
)}
      <div className="flex-1 space-y-2">
        <input id={id} aria-describedby={describedBy} className={inputCls} value={value} placeholder="Image URL or upload →" onChange={(e) => onChange(e.target.value)} />
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/50">
          <Upload className="h-3.5 w-3.5" /> {busy ? "Uploading…": "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                onChange(await uploadImage(file));
              } catch (err) {
                alert("Upload failed: " + (err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
    </div>
);
}

function TagsInput({ value, onChange, placeholder, label }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string }) {
  const [draft, setDraft] = useState("");
  const list = value || [];
  const add = () => {
    const t = draft.trim();
    if (t && !list.includes(t)) onChange([...list, t]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-input bg-background p-2">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {list.map((t) => (
          <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-muted py-0.5 pl-2.5 pr-1 text-xs">
            {t}
            {/* The glyph stays 12px so the chip still reads as a chip; the button
                around it is padded to 24x24 for WCAG 2.5.8, which is why the chip's
                right padding drops to pr-1: the button supplies the rest. */}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(list.filter((x) => x !== t))} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:text-destructive">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
))}
      </div>
      <input
        aria-label={`Add a ${label.toLowerCase()} entry`}
        /* min-h-6: the bare input measured 20px tall, under the 24px pointer
           target minimum, and it sits 8px under the chip row's own remove
           buttons, close enough that the spacing exception does not rescue it. */
        className="min-h-6 w-full bg-transparent px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={draft}
        placeholder={placeholder || "Type and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
);
}

function StringList({ value, onChange, placeholder, label }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string }) {
  const list = value || [];
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            aria-label={`${label}, item ${i + 1}`}
            className={inputCls}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value: x)))}
          />
          <button type="button" aria-label={`Remove ${label}, item ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
))}
      <button type="button" onClick={() => onChange([...list, ""])} className="inline-flex min-h-6 items-center gap-1 text-sm text-primary">
        <Plus className="h-4 w-4" aria-hidden="true" /> Add item
      </button>
    </div>
);
}

function ArrayInput({ value, onChange, itemFields }: { value: any[]; onChange: (v: any[]) => void; itemFields: FieldConfig[] }) {
  const list = value || [];
  const emptyItem = () => Object.fromEntries(itemFields.map((f) => [f.name, f.type === "number" ? 0: f.type === "boolean" ? false: f.type === "tags" || f.type === "stringlist" || f.type === "array" ? []: ""]));
  return (
    <div className="space-y-3">
      {list.map((item, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
            <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {itemFields.map((f) => (
              <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                <AdminField field={f} value={item[f.name]} onChange={(v) => onChange(list.map((x, j) => (j === i ? {...x, [f.name]: v }: x)))} />
              </div>
))}
          </div>
        </div>
))}
      <button onClick={() => onChange([...list, emptyItem()])} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary/50">
        <Plus className="h-4 w-4" /> Add
      </button>
    </div>
);
}

/* Field types that are ONE control, and so can take a <label for>. The rest are
   several inputs at once and are labelled with a role="group" + aria-labelledby,
   because a <label> may only ever point at a single control. */
const SINGLE_CONTROL = new Set<FieldType>(["text", "textarea", "richtext", "number", "select", "image"]);

export function AdminField({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (v: any) => void }) {
  // Stable per-instance ids. AdminField renders recursively through arrays and
  // groups, so the same field name appears many times on one page; useId keeps
  // each label pointing at its own control.
  const uid = useId();
  const id = `${uid}-${field.name}`;
  const labelId = `${id}-label`;
  const helpId = field.help ? `${id}-help`: undefined;
  const single = SINGLE_CONTROL.has(field.type);

  const control = () => {
    switch (field.type) {
      case "textarea":
      case "richtext":
        return <textarea id={id} aria-describedby={helpId} className={cn(inputCls, "min-h-[120px] font-mono text-xs")} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
      case "number":
        return <input id={id} aria-describedby={helpId} type="number" className={inputCls} value={value ?? 0} placeholder={field.placeholder} onChange={(e) => onChange(Number(e.target.value))} />;
      case "boolean":
        return (
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            aria-labelledby={labelId}
            aria-describedby={helpId}
            onClick={() => onChange(!value)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              value ? "bg-primary": "bg-muted"
)}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background transition-transform", value ? "translate-x-6": "translate-x-1")} />
          </button>
);
      case "select":
        return (
          <select id={id} aria-describedby={helpId} className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
))}
          </select>
);
      case "image":
        return <ImageInput id={id} describedBy={helpId} value={value ?? ""} onChange={onChange} />;
      case "tags":
        return <TagsInput label={field.label} value={value ?? []} onChange={onChange} placeholder={field.placeholder} />;
      case "stringlist":
        return <StringList label={field.label} value={value ?? []} onChange={onChange} placeholder={field.placeholder} />;
      case "array":
        return <ArrayInput value={value ?? []} onChange={onChange} itemFields={field.itemFields || []} />;
      case "group":
        return (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {(field.fields || []).map((f) => (
              <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                <AdminField field={f} value={(value || {})[f.name]} onChange={(v) => onChange({...(value || {}), [f.name]: v })} />
              </div>
))}
          </div>
);
      default:
        return <input id={id} aria-describedby={helpId} className={inputCls} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-input bg-background px-3 py-2.5">
        <div>
          <span id={labelId} className="text-sm font-medium">{field.label}</span>
          {field.help && <p id={helpId} className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
        {control()}
      </div>
);
  }

  if (single) {
    return (
      <div>
        <Label htmlFor={id} helpId={helpId} help={field.help}>{field.label}</Label>
        {control()}
      </div>
);
  }

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={helpId}>
      <Label as="span" id={labelId} helpId={helpId} help={field.help}>{field.label}</Label>
      {control()}
    </div>
);
}
