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

type AudioOutputFormat = "mp3" | "wav" | "pcm" | "ogg";

const audioMimeByFormat = new Map([
  ["mp3", "audio/mpeg"],
  ["mpeg", "audio/mpeg"],
  ["wav", "audio/wav"],
  ["ogg", "audio/ogg"],
  ["pcm", "application/octet-stream"],
]);
const supportedAudioMimeTypes = new Set(audioMimeByFormat.values());

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
  outputFormat,
  voiceId,
}: {
  audioBytes: Buffer;
  contentType: string;
  modelId: string;
  outputFormat?: string | null;
  voiceId?: string | null;
}) {
  const format =
    normalizeAudioOutputFormat(outputFormat) ?? audioFormatFromContentType(contentType);
  const fileName = `${safeFileName(modelId)}-${safeFileName(voiceId || "voice")}-${Date.now()}.${format}`;
  const relativePath = path.join("previews", `${randomUUID()}-${fileName}`);

  const savedAsset = await writeAudioAsset({
    audioBytes,
    contentType,
    relativePath,
    fileName,
    outputFormat: format,
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
  outputFormat,
  projectId,
  segmentIndex,
}: {
  audioBytes: Buffer;
  audioExportId: string;
  chapterNumber: number;
  chapterTitle: string;
  contentType: string;
  outputFormat?: string | null;
  projectId: string;
  segmentIndex: number;
}) {
  const format =
    normalizeAudioOutputFormat(outputFormat) ?? audioFormatFromContentType(contentType);
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
    outputFormat: format,
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

export function normalizeAudioContentType(contentType: string) {
  return contentType.toLowerCase().split(";")[0].trim();
}

export function isSupportedAudioContentType(contentType: string) {
  return supportedAudioMimeTypes.has(normalizeAudioContentType(contentType));
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

function audioFormatFromContentType(contentType: string): AudioOutputFormat {
  const normalized = normalizeAudioContentType(contentType);

  if (normalized === "audio/wav") {
    return "wav";
  }

  if (normalized === "audio/ogg") {
    return "ogg";
  }

  if (normalized === "application/octet-stream") {
    return "pcm";
  }

  return "mp3";
}

function normalizeAudioOutputFormat(
  outputFormat?: string | null,
): AudioOutputFormat | null {
  const normalized = outputFormat?.trim().toLowerCase();

  if (
    normalized === "mp3" ||
    normalized === "wav" ||
    normalized === "pcm" ||
    normalized === "ogg"
  ) {
    return normalized;
  }

  return null;
}

function audioMimeTypeFromPath(relativePath: string) {
  const extension = path.extname(relativePath).slice(1).toLowerCase();
  return audioMimeByFormat.get(extension) ?? "audio/mpeg";
}

async function writeAudioAsset({
  audioBytes,
  contentType,
  fileName,
  outputFormat,
  relativePath,
}: {
  audioBytes: Buffer;
  contentType: string;
  fileName: string;
  outputFormat: AudioOutputFormat;
  relativePath: string;
}): Promise<StoredAudioAsset> {
  if (audioBytes.byteLength <= 0) {
    throw new Error("TTS 接口没有返回有效音频。");
  }

  if (audioBytes.byteLength > maxAudioSegmentBytes) {
    throw new Error("TTS 音频分段超过本地保存上限。");
  }

  const normalizedContentType = normalizeAudioContentType(contentType);
  const detectedContentType = detectAudioMimeType(audioBytes);
  const expectedContentType = audioMimeByFormat.get(outputFormat);

  if (!isSupportedAudioContentType(normalizedContentType)) {
    throw new Error("TTS 接口返回的不是支持的音频格式。");
  }

  if (normalizedContentType === "application/octet-stream") {
    if (outputFormat !== "pcm" && detectedContentType !== expectedContentType) {
      throw new Error("TTS 音频内容与响应格式不匹配。");
    }
  } else if (!detectedContentType || detectedContentType !== normalizedContentType) {
    throw new Error("TTS 音频内容与响应格式不匹配。");
  }

  const absolutePath = resolveAudioAssetPath(relativePath);

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, audioBytes);

  return {
    relativePath,
    fileName,
    mimeType:
      detectedContentType ||
      normalizeAudioContentType(contentType) ||
      "application/octet-stream",
    sizeBytes: audioBytes.byteLength,
  };
}

function detectAudioMimeType(audioBytes: Buffer) {
  if (audioBytes.length >= 3 && audioBytes.subarray(0, 3).toString("ascii") === "ID3") {
    return "audio/mpeg";
  }

  if (
    audioBytes.length >= 2 &&
    audioBytes[0] === 0xff &&
    (audioBytes[1] & 0xe0) === 0xe0
  ) {
    return "audio/mpeg";
  }

  if (
    audioBytes.length >= 12 &&
    audioBytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    audioBytes.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return "audio/wav";
  }

  if (audioBytes.length >= 4 && audioBytes.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }

  return null;
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
