import { useParams } from "react-router-dom";
import type { SingletonKey } from "@/lib/cms/types";
import { singletonSchemas } from "@/admin/schemas";
import { SingletonEditor } from "@/admin/SingletonEditor";

export default function AdminSingleton() {
  const { singleton } = useParams();
  const schema = singleton ? singletonSchemas[singleton as SingletonKey] : undefined;

  if (!schema) return <p className="text-muted-foreground">Unknown settings page: {singleton}</p>;
  return <SingletonEditor singletonKey={singleton as SingletonKey} schema={schema} />;
}
