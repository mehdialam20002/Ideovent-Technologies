import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import type { SingletonKey } from "@/lib/cms/types";
import { useCms } from "@/lib/cms/context";
import { getIcon } from "@/lib/icons";
import { AdminField } from "./fields";
import type { SingletonSchema } from "./schemas";
import { cn } from "@/lib/utils";

export function SingletonEditor({ singletonKey, schema }: { singletonKey: SingletonKey; schema: SingletonSchema }) {
  const { data, actions } = useCms();
  const [draft, setDraft] = useState<any>(() => JSON.parse(JSON.stringify(data[singletonKey])));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(data[singletonKey])));
  }, [singletonKey, data]);

  const save = async () => {
    setSaving(true);
    try {
      await actions.saveSingleton(singletonKey, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const Icon = getIcon(schema.icon);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h1 className="font-display text-2xl font-semibold">{schema.label}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {schema.fields.map((f) => (
          <div key={f.name} className={cn(f.full && "sm:col-span-2")}>
            <AdminField field={f} value={draft[f.name]} onChange={(v) => setDraft({ ...draft, [f.name]: v })} />
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-8">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-60">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
