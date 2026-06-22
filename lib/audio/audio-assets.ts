import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredAudioAsset = {
  relativePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

const audioMimeByFormat = new Map([
  ["mp3", "audio/mpeg"],
  ["mpeg", "audio/mpeg"],
  ["wav", "audio/wav"],
  ["ogg", "audio/ogg"],
  ["pcm", "application/octet-stream"],
]);

export const maxAudioSegmentBytes = 20 * 1024 * 1024;

export function getAudioAssetRoot() {
  const desktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR?.trim();

  if (desktopDataDir) {
    return path.join(desktopDataDir, "exports", "audio");
  }

  if (process.platform === "darwin" && process.env.NOVELFORGE_DESKTOP === "1") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "NovelForge AI",
      "exports",
      "audio",
    );
  }

  return path.join(process.cwd(), ".novelforge-assets", "exports", "audio");
}

export async function saveAudioPreviewAsset({
  audioBytes,
  contentType,
  modelId,
  voiceId,
}: {
  audioBytes: Buffer;
  contentType: string;
  modelId: string;
  voiceId?: string | null;
}) {
  const format = audioFormatFromContentType(contentType);
  const fileName = `${safeFileName(modelId)}-${safeFileName(voiceId || "voice")}-${Date.now()}.${format}`;
  const relativePath = path.join("previews", `${randomUUID()}-${fileName}`);

  const savedAsset = await writeAudioAsset({
    audioBytes,
    contentType,
    relativePath,
    fileName,
  });

  await cleanupAudioPreviewAssets({
    keepLatest: 10,
  });

  return savedAsset;
}

export async function saveAudioExportSegmentAsset({
  audioBytes,
  audioExportId,
  chapterNumber,
  chapterTitle,
  contentType,
  projectId,
  segmentIndex,
}: {
  audioBytes: Buffer;
  audioExportId: string;
  chapterNumber: number;
  chapterTitle: string;
  contentType: string;
  projectId: string;
  segmentIndex: number;
}) {
  const format = audioFormatFromContentType(contentType);
  const chapterLabel = `${String(chapterNumber).padStart(3, "0")}-${safeFileName(chapterTitle)}`;
  const segmentLabel = `segment-${String(segmentIndex).padStart(3, "0")}`;
  const fileName = `${chapterLabel}.${segmentLabel}.${format}`;
  const relativePath = path.join(
    safePathSegment(projectId),
    safePathSegment(audioExportId),
    fileName,
  );

  return writeAudioAsset({
    audioBytes,
    contentType,
    relativePath,
    fileName,
  });
}

export async function writeAudioExportMetadata({
  audioExportId,
  metadata,
  projectId,
}: {
  audioExportId: string;
  metadata: unknown;
  projectId: string;
}) {
  const relativePath = path.join(
    safePathSegment(projectId),
    safePathSegment(audioExportId),
    "metadata.json",
  );
  const absolutePath = resolveAudioAssetPath(relativePath);

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(
    absolutePath,
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );

  return relativePath;
}

export function audioDirectoryForExport(projectId: string, audioExportId: string) {
  return path.join(
    getAudioAssetRoot(),
    safePathSegment(projectId),
    safePathSegment(audioExportId),
  );
}

export async function openAudioAsset(relativePath: string) {
  const absolutePath = resolveAudioAssetPath(relativePath);
  const stat = await fs.promises.stat(absolutePath);

  if (!stat.isFile()) {
    throw new Error("Audio asset is not a file.");
  }

  return {
    stream: fs.createReadStream(absolutePath),
    sizeBytes: stat.size,
    mimeType: audioMimeTypeFromPath(relativePath),
  };
}

export function isAudioPreviewPath(relativePath: string) {
  const cleanRelativePath = path.normalize(relativePath);

  return (
    cleanRelativePath.startsWith(`previews${path.sep}`) &&
    !cleanRelativePath.includes(`..${path.sep}`) &&
    !path.isAbsolute(cleanRelativePath)
  );
}

export function resolveAudioAssetPath(relativePath: string) {
  const cleanRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.resolve(getAudioAssetRoot(), cleanRelativePath);
  const root = path.resolve(getAudioAssetRoot());

  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid audio asset path.");
  }

  if (
    !cleanRelativePath.startsWith(`previews${path.sep}`) &&
    cleanRelativePath !== "previews" &&
    !/^[^/\\]+[\\/][^/\\]+[\\/]/.test(cleanRelativePath)
  ) {
    throw new Error("Invalid audio asset path.");
  }

  return absolutePath;
}

function audioFormatFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase().split(";")[0].trim();

  for (const [format, mimeType] of audioMimeByFormat.entries()) {
    if (mimeType === normalized) {
      return format === "mpeg" ? "mp3" : format;
    }
  }

  return "mp3";
}

function audioMimeTypeFromPath(relativePath: string) {
  const extension = path.extname(relativePath).slice(1).toLowerCase();
  return audioMimeByFormat.get(extension) ?? "audio/mpeg";
}

async function writeAudioAsset({
  audioBytes,
  contentType,
  fileName,
  relativePath,
}: {
  audioBytes: Buffer;
  contentType: string;
  fileName: string;
  relativePath: string;
}): Promise<StoredAudioAsset> {
  if (audioBytes.byteLength <= 0) {
    throw new Error("TTS 接口没有返回有效音频。");
  }

  if (audioBytes.byteLength > maxAudioSegmentBytes) {
    throw new Error("TTS 音频分段超过本地保存上限。");
  }

  const absolutePath = resolveAudioAssetPath(relativePath);

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, audioBytes);

  return {
    relativePath,
    fileName,
    mimeType: contentType.split(";")[0].trim() || "audio/mpeg",
    sizeBytes: audioBytes.byteLength,
  };
}

async function cleanupAudioPreviewAssets({
  keepLatest,
}: {
  keepLatest: number;
}) {
  const previewRoot = path.join(getAudioAssetRoot(), "previews");
  const entries = await fs.promises.readdir(previewRoot).catch(() => []);
  const files = (
    await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = path.join(previewRoot, entry);
        const stat = await fs.promises.stat(absolutePath).catch(() => null);

        return stat?.isFile()
          ? {
              absolutePath,
              mtimeMs: stat.mtimeMs,
            }
          : null;
      }),
    )
  )
    .filter(
      (
        file,
      ): file is {
        absolutePath: string;
        mtimeMs: number;
      } => Boolean(file),
    )
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  await Promise.all(
    files.slice(keepLatest).map((file) =>
      fs.promises.unlink(file.absolutePath).catch(() => undefined),
    ),
  );
}

function safePathSegment(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "item"
  );
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|\r\n]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "audio"
  );
}
