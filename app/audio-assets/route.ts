import { Readable } from "node:stream";
import { notFound } from "next/navigation";
import { isAudioPreviewPath, openAudioAsset } from "@/lib/audio/audio-assets";

export async function GET(request: Request) {
  const assetPath = new URL(request.url).searchParams.get("assetPath");

  if (!assetPath) {
    notFound();
  }

  if (!isAudioPreviewPath(assetPath)) {
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
