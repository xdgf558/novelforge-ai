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

export async function mergeWavAudioExportSegments({
  audioExportId,
  chapterNumber,
  chapterTitle,
  projectId,
  segmentPaths,
}: {
  audioExportId: string;
  chapterNumber: number;
  chapterTitle: string;
  projectId: string;
  segmentPaths: string[];
}) {
  if (segmentPaths.length === 0) {
    throw new Error("没有可合并的音频分段。");
  }

  const segmentInfos = await Promise.all(
    segmentPaths.map(async (relativePath) => {
      const absolutePath = resolveAudioAssetPath(relativePath);
      const stat = await fs.promises.stat(absolutePath);

      if (!stat.isFile()) {
        throw new Error("音频分段文件不存在。");
      }

      return {
        absolutePath,
        info: await readWavInfo(absolutePath),
      };
    }),
  );
  const first = segmentInfos[0]?.info;

  if (!first) {
    throw new Error("没有可合并的音频分段。");
  }

  for (const segment of segmentInfos) {
    if (!sameWavFormat(first, segment.info)) {
      throw new Error("音频分段格式不一致，无法自动合并。");
    }
  }

  const dataBytes = segmentInfos.reduce(
    (sum, segment) => sum + segment.info.dataSize,
    0,
  );
  const chapterLabel = `${String(chapterNumber).padStart(3, "0")}-${safeFileName(
    chapterTitle,
  )}`;
  const fileName = `${chapterLabel}.merged.wav`;
  const relativePath = path.join(
    safePathSegment(projectId),
    safePathSegment(audioExportId),
    fileName,
  );
  const absolutePath = resolveAudioAssetPath(relativePath);

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  let stat: fs.Stats;

  try {
    await writeMergedWavFile({
      absolutePath,
      dataBytes,
      format: first,
      segments: segmentInfos,
    });
    stat = await fs.promises.stat(absolutePath);
  } catch (error) {
    await fs.promises.rm(absolutePath, { force: true }).catch(() => undefined);
    throw error;
  }

  return {
    relativePath,
    fileName,
    mimeType: "audio/wav",
    sizeBytes: stat.size,
  };
}

export function audioDirectoryForExport(projectId: string, audioExportId: string) {
  return path.join(
    getAudioAssetRoot(),
    safePathSegment(projectId),
    safePathSegment(audioExportId),
  );
}

export async function deleteAudioExportAssets({
  audioExportId,
  projectId,
}: {
  audioExportId: string;
  projectId: string;
}) {
  const directory = audioDirectoryForExport(projectId, audioExportId);
  const root = path.resolve(getAudioAssetRoot());
  const resolvedDirectory = path.resolve(directory);

  if (
    resolvedDirectory === root ||
    !resolvedDirectory.startsWith(`${root}${path.sep}`)
  ) {
    throw new Error("Invalid audio export directory.");
  }

  await fs.promises.rm(resolvedDirectory, {
    force: true,
    recursive: true,
  });
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

type WavInfo = {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
};

async function readWavInfo(absolutePath: string): Promise<WavInfo> {
  const handle = await fs.promises.open(absolutePath, "r");

  try {
    const header = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(header, 0, header.byteLength, 0);
    const bytes = header.subarray(0, bytesRead);

    if (
      bytes.length < 44 ||
      bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
      bytes.subarray(8, 12).toString("ascii") !== "WAVE"
    ) {
      throw new Error("音频分段不是有效 WAV 文件。");
    }

    let offset = 12;
    let fmt:
      | Pick<
          WavInfo,
          | "audioFormat"
          | "bitsPerSample"
          | "blockAlign"
          | "byteRate"
          | "channels"
          | "sampleRate"
        >
      | null = null;
    let dataOffset = 0;
    let dataSize = 0;

    while (offset + 8 <= bytes.length) {
      const chunkId = bytes.subarray(offset, offset + 4).toString("ascii");
      const chunkSize = bytes.readUInt32LE(offset + 4);
      const chunkDataOffset = offset + 8;

      if (chunkDataOffset + chunkSize > bytes.length) {
        break;
      }

      if (chunkId === "fmt ") {
        fmt = {
          audioFormat: bytes.readUInt16LE(chunkDataOffset),
          channels: bytes.readUInt16LE(chunkDataOffset + 2),
          sampleRate: bytes.readUInt32LE(chunkDataOffset + 4),
          byteRate: bytes.readUInt32LE(chunkDataOffset + 8),
          blockAlign: bytes.readUInt16LE(chunkDataOffset + 12),
          bitsPerSample: bytes.readUInt16LE(chunkDataOffset + 14),
        };
      }

      if (chunkId === "data") {
        dataOffset = chunkDataOffset;
        dataSize = chunkSize;
        break;
      }

      offset = chunkDataOffset + chunkSize + (chunkSize % 2);
    }

    if (!fmt || dataOffset <= 0 || dataSize <= 0) {
      throw new Error("WAV 文件缺少可合并的音频数据。");
    }

    if (fmt.audioFormat !== 1) {
      throw new Error("当前只支持合并 PCM WAV 音频。");
    }

    return {
      ...fmt,
      dataOffset,
      dataSize,
    };
  } finally {
    await handle.close();
  }
}

function sameWavFormat(left: WavInfo, right: WavInfo) {
  return (
    left.audioFormat === right.audioFormat &&
    left.bitsPerSample === right.bitsPerSample &&
    left.blockAlign === right.blockAlign &&
    left.byteRate === right.byteRate &&
    left.channels === right.channels &&
    left.sampleRate === right.sampleRate
  );
}

async function writeMergedWavFile({
  absolutePath,
  dataBytes,
  format,
  segments,
}: {
  absolutePath: string;
  dataBytes: number;
  format: WavInfo;
  segments: Array<{
    absolutePath: string;
    info: WavInfo;
  }>;
}) {
  if (dataBytes > 0xffffffff - 36) {
    throw new Error("合并后的 WAV 文件超过 4GB，无法写入标准 WAV。");
  }

  const output = fs.createWriteStream(absolutePath);

  try {
    output.write(buildWavHeader(format, dataBytes));

    for (const segment of segments) {
      await pipeSegmentData(output, segment.absolutePath, segment.info);
    }
  } finally {
    await closeWritable(output);
  }
}

function buildWavHeader(format: WavInfo, dataBytes: number) {
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(format.audioFormat, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(format.byteRate, 28);
  header.writeUInt16LE(format.blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataBytes, 40);

  return header;
}

function pipeSegmentData(
  output: fs.WriteStream,
  absolutePath: string,
  info: WavInfo,
) {
  return new Promise<void>((resolve, reject) => {
    const input = fs.createReadStream(absolutePath, {
      end: info.dataOffset + info.dataSize - 1,
      start: info.dataOffset,
    });

    input.on("error", reject);
    output.on("error", reject);
    input.on("end", resolve);
    input.pipe(output, { end: false });
  });
}

function closeWritable(output: fs.WriteStream) {
  return new Promise<void>((resolve, reject) => {
    output.end(() => resolve());
    output.on("error", reject);
  });
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
