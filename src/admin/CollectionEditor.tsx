import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Save } from "lucide-react";
import type { CollectionKey, BaseDoc } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { sortByOrder } from "@/lib/cms/store";
import { getIcon } from "@/lib/icons";
import { AdminField } from "./fields";
import type { CollectionSchema } from "./schemas";
import { cn } from "@/lib/utils";

export function CollectionEditor({ collectionKey, schema }: { collectionKey: CollectionKey; schema: CollectionSchema }) {
  const { data, actions } = useCms();
  const items = sortByOrder((data[collectionKey] as BaseDoc[]) || []);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const startNew = () => setEditing(schema.defaults());
  const save = async () => {
    setSaving(true);
    try {
      await actions.saveDoc(collectionKey, editing);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (confirm("Delete this item? This cannot be undone.")) await actions.removeDoc(collectionKey, id);
  };
  const move = async (i: number, dir: -1 | 1) => {
    const ids = items.map((d) => d.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await actions.reorder(collectionKey, ids);
  };

  const Icon = getIcon(schema.icon);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">{schema.label}</h1>
            <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>
          </div>
        </div>
        <button onClick={startNew} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add {schema.singular}
        </button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No {schema.label.toLowerCase()} yet. Click "Add {schema.singular}".
          </div>
        )}
        {items.map((item: any, i) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
            {schema.imageField && (
              <img
                src={typeof item[schema.imageField] === "string" ? item[schema.imageField] : item[schema.imageField]?.src}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{String(item[schema.titleField] || "Untitled")}</p>
              {schema.subtitleField && <p className="truncate text-sm text-muted-foreground">{String(item[schema.subtitleField] || "")}</p>}
            </div>
            <button onClick={() => setEditing({ ...item })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:border-primary/50"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{items.find((x) => x.id === editing.id) ? "Edit" : "New"} {schema.singular}</h2>
              <button onClick={() => setEditing(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {schema.fields.map((f) => (
                <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
                  <AdminField field={f} value={editing[f.name]} onChange={(v) => setEditing({ ...editing, [f.name]: v })} />
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 mt-6 flex gap-3 bg-background pt-4">
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
