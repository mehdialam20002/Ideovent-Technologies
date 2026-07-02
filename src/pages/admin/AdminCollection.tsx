import { useParams } from "react-router-dom";
import type { CollectionKey } from "@/lib/cms/types";
import { collectionSchemas } from "@/admin/schemas";
import { CollectionEditor } from "@/admin/CollectionEditor";

export default function AdminCollection() {
  const { collection } = useParams();
  const schema = collection ? collectionSchemas[collection as CollectionKey] : undefined;

  if (!schema) return <p className="text-muted-foreground">Unknown content type: {collection}</p>;
  return <CollectionEditor collectionKey={collection as CollectionKey} schema={schema} />;
}
