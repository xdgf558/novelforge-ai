import { Readable } from "node:stream";
import { notFound } from "next/navigation";
import { openProjectCoverCandidateAsset } from "@/lib/project-cover-assets";

type CoverAssetRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, { params }: CoverAssetRouteProps) {
  const { projectId } = await params;
  const assetPath = new URL(request.url).searchParams.get("assetPath");

  if (!assetPath) {
    notFound();
  }

  try {
    const asset = await openProjectCoverCandidateAsset({
      assetPath,
      projectId,
    });

    return new Response(Readable.toWeb(asset.stream) as ReadableStream, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(asset.sizeBytes),
        "Content-Type": asset.mimeType,
      },
    });
  } catch {
    notFound();
  }
}
