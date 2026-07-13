import { createShortStorySeries } from "@/app/series/actions";
import { importShortStorySeriesDocument } from "@/app/series/import/actions";
import { SeriesDocumentImport } from "@/components/short-story-series/series-document-import";

export default function ImportShortStorySeriesDocumentPage() {
  return (
    <SeriesDocumentImport
      createAction={createShortStorySeries}
      importAction={importShortStorySeriesDocument}
    />
  );
}
