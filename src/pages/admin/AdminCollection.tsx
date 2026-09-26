import { useParams } from "react-router-dom";
import type { CollectionKey } from "@/lib/cms/types";
import { collectionSchemas } from "@/admin/schemas";
import { CollectionEditor } from "@/admin/CollectionEditor";
import { PitchPagesEditor } from "@/admin/PitchPagesEditor";
import { DemoSitesEditor } from "@/admin/DemoSitesEditor";

export default function AdminCollection() {
  const { collection } = useParams();
  const schema = collection ? collectionSchemas[collection as CollectionKey] : undefined;

  if (!schema) return <p className="text-muted-foreground">Unknown content type: {collection}</p>;

  /*
    Pitch pages keep the /admin/c/<collection> address, and the schema in
    schemas.ts supplies the form, but the LIST is its own component. A pitch
    page needs a validated slug, duplicate, set live / archive, and a copy-link
    button that yields the full https:// address; none of those belong in the
    generic editor, and every other collection would carry the weight of them.
    See src/admin/PitchPagesEditor.tsx.
  */
  if (collection === "pitchPages") return <PitchPagesEditor schema={schema} />;

  /*
    Demo sites, for the same reason and then some. On top of the validated slug,
    duplicate and copy-link that a pitch page needs, this list carries search
    and three filters (at thirty rows the reason a record gets reused is that
    the free one could not be found), an open counter, and the edit lock that
    stops a demo which has already been sent from being silently overwritten
    with another institute's name. See src/admin/DemoSitesEditor.tsx and the
    header of src/lib/demo/slots.ts.
  */
  if (collection === "demoSites") return <DemoSitesEditor schema={schema} />;

  return <CollectionEditor collectionKey={collection as CollectionKey} schema={schema} />;
}
