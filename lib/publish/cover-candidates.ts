import {
  type GeneratedImageResult,
} from "@/lib/ai/image-client";
import {
  deleteProjectCoverAsset,
  saveProjectCoverCandidateAssetFromBuffer,
} from "@/lib/project-cover-assets";

export async function persistGeneratedCoverCandidates({
  images,
  projectId,
  taskId,
}: {
  images: GeneratedImageResult[];
  projectId: string;
  taskId: string;
}) {
  const savedPaths: string[] = [];
  const persistedImages: Array<{
    assetPath: string;
    fileName: string;
    mimeType: string;
    revisedPrompt: string | null;
    sizeBytes: number;
  }> = [];
  let skippedUrlCount = 0;

  try {
    for (const [index, image] of images.entries()) {
      const source = generatedImageBufferFromBase64(image);

      if (!source) {
        if (image.url) {
          skippedUrlCount += 1;
        }

        continue;
      }

      const saved = await saveProjectCoverCandidateAssetFromBuffer({
        buffer: source.buffer,
        fileName: `generated-cover-${index + 1}`,
        mimeType: source.mimeType,
        projectId,
        taskId,
      });

      savedPaths.push(saved.relativePath);
      persistedImages.push({
        assetPath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        revisedPrompt: image.revisedPrompt,
        sizeBytes: saved.sizeBytes,
      });
    }

    if (persistedImages.length === 0 && skippedUrlCount > 0) {
      throw new Error(
        "图片生成接口只返回了 URL 型候选图。为保护本机安全，请改用返回 base64 图片数据的接口或模型配置。",
      );
    }

    if (persistedImages.length === 0) {
      throw new Error("图片生成接口没有返回可保存的图片数据。");
    }

    return {
      images: persistedImages,
      skippedUrlCount,
    };
  } catch (error) {
    await Promise.all(savedPaths.map((assetPath) => deleteProjectCoverAsset(assetPath)));

    throw error;
  }
}

function generatedImageBufferFromBase64(image: GeneratedImageResult) {
  if (image.dataBase64) {
    const declaredMimeType = image.mimeType || mimeTypeFromDataUrl(image.dataUrl);

    return {
      buffer: Buffer.from(image.dataBase64, "base64"),
      mimeType: normalizeGeneratedImageMimeType(declaredMimeType),
    };
  }

  if (image.dataUrl) {
    const parsed = parseDataUrl(image.dataUrl);

    return {
      buffer: Buffer.from(parsed.base64, "base64"),
      mimeType: parsed.mimeType,
    };
  }

  return null;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());

  if (!match) {
    throw new Error("图片数据 URL 格式无效。");
  }

  const mimeType = normalizeGeneratedImageMimeType(match[1]);

  return {
    base64: match[2],
    mimeType,
  };
}

function mimeTypeFromDataUrl(dataUrl?: string | null) {
  if (!dataUrl) {
    return null;
  }

  const match = /^data:([^;,]+);base64,/i.exec(dataUrl.trim());

  return match ? normalizeGeneratedImageMimeType(match[1]) : null;
}

function normalizeGeneratedImageMimeType(value?: string | null) {
  const mimeType = value?.split(";")[0]?.trim().toLowerCase() || "image/png";

  if (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  ) {
    return mimeType;
  }

  throw new Error("生成的封面图片格式不受支持。");
}
