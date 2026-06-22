import { Readable } from "node:stream";
import { notFound } from "next/navigation";
import { openAudioAsset } from "@/lib/audio/audio-assets";
import { prisma } from "@/lib/prisma";

type AudioAssetRouteProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, { params }: AudioAssetRouteProps) {
  const [{ projectId }, assetPath] = await Promise.all([
    params,
    Promise.resolve(new URL(request.url).searchParams.get("assetPath")),
  ]);

  if (!assetPath) {
    notFound();
  }

  const matchedSegment = await prisma.audioExportSegment.findFirst({
    where: {
      localPath: assetPath,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!matchedSegment) {
    notFound();
  }

  try {
    const asset = await openAudioAsset(assetPath);

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
