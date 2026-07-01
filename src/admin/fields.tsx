import { useState } from "react";
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

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary";

function Label({ children, help }: { children: React.ReactNode; help?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium">{children}</label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

export function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="h-16 w-16 rounded-xl border border-border object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
          <Upload className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 space-y-2">
        <input className={inputCls} value={value} placeholder="Image URL or upload →" onChange={(e) => onChange(e.target.value)} />
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:border-primary/50">
          <Upload className="h-3.5 w-3.5" /> {busy ? "Uploading…" : "Upload"}
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

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
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
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
            {t}
            <button onClick={() => onChange(list.filter((x) => x !== t))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        className="w-full bg-transparent px-1 text-sm outline-none"
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

function StringList({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const list = value || [];
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className={inputCls}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...list, ""])} className="inline-flex items-center gap-1 text-sm text-primary">
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}

function ArrayInput({ value, onChange, itemFields }: { value: any[]; onChange: (v: any[]) => void; itemFields: FieldConfig[] }) {
  const list = value || [];
  const emptyItem = () => Object.fromEntries(itemFields.map((f) => [f.name, f.type === "number" ? 0 : f.type === "boolean" ? false : f.type === "tags" || f.type === "stringlist" || f.type === "array" ? [] : ""]));
  return (
    <div className="space-y-3">
      {list.map((item, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
            <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {itemFields.map((f) => (
              <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                <AdminField field={f} value={item[f.name]} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [f.name]: v } : x)))} />
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

export function AdminField({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (v: any) => void }) {
  const control = () => {
    switch (field.type) {
      case "textarea":
      case "richtext":
        return <textarea className={cn(inputCls, "min-h-[120px] font-mono text-xs")} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
      case "number":
        return <input type="number" className={inputCls} value={value ?? 0} placeholder={field.placeholder} onChange={(e) => onChange(Number(e.target.value))} />;
      case "boolean":
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}
          >
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-background transition-transform", value ? "translate-x-6" : "translate-x-1")} />
          </button>
        );
      case "select":
        return (
          <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        );
      case "image":
        return <ImageInput value={value ?? ""} onChange={onChange} />;
      case "tags":
        return <TagsInput value={value ?? []} onChange={onChange} placeholder={field.placeholder} />;
      case "stringlist":
        return <StringList value={value ?? []} onChange={onChange} placeholder={field.placeholder} />;
      case "array":
        return <ArrayInput value={value ?? []} onChange={onChange} itemFields={field.itemFields || []} />;
      case "group":
        return (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
            {(field.fields || []).map((f) => (
              <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                <AdminField field={f} value={(value || {})[f.name]} onChange={(v) => onChange({ ...(value || {}), [f.name]: v })} />
              </div>
            ))}
          </div>
        );
      default:
        return <input className={inputCls} value={value ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-input bg-background px-3 py-2.5">
        <div>
          <span className="text-sm font-medium">{field.label}</span>
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
        {control()}
      </div>
    );
  }

  return (
    <div>
      <Label help={field.help}>{field.label}</Label>
      {control()}
    </div>
  );
}
