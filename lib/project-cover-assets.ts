import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type CoverProjectRecord = {
  id?: string | number | boolean | Date | null;
  title?: string | number | boolean | Date | null;
  coverImagePath?: string | number | boolean | Date | null;
  coverImageMimeType?: string | number | boolean | Date | null;
  coverImageFileName?: string | number | boolean | Date | null;
  coverImageSizeBytes?: string | number | boolean | Date | null;
  coverImageUpdatedAt?: string | number | boolean | Date | null;
  coverAltText?: string | number | boolean | Date | null;
};

export type StoredProjectCoverAsset = {
  relativePath: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  updatedAt: Date;
};

export type ProjectCoverPayload = {
  prompt: string;
  imagePath: string | null;
  imageUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  dataBase64: string | null;
  dataUrl: string | null;
  altText: string | null;
  updatedAt: string | null;
  status: "not_generated" | "ready";
};

const maxCoverImageBytes = 8 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function coverImageAcceptAttribute() {
  return [...allowedImageTypes.keys()].join(",");
}

export function getProjectCoverAssetRoot() {
  const desktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR?.trim();

  if (desktopDataDir) {
    return path.join(desktopDataDir, "assets");
  }

  return path.join(process.cwd(), ".novelforge-assets");
}

export async function saveProjectCoverAsset({
  file,
  previousRelativePath,
  projectId,
}: {
  file: File;
  previousRelativePath?: string | null;
  projectId: string;
}): Promise<StoredProjectCoverAsset> {
  if (file.size <= 0) {
    throw new Error("请选择有效的封面图片文件。");
  }

  if (file.size > maxCoverImageBytes) {
    throw new Error("封面图片不能超过 8MB。");
  }

  const mimeType = normalizeMimeType(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  return saveProjectCoverAssetFromBuffer({
    buffer,
    fileName: file.name,
    mimeType,
    previousRelativePath,
    projectId,
  });
}

export async function saveProjectCoverAssetFromBuffer({
  buffer,
  fileName,
  mimeType,
  previousRelativePath,
  projectId,
}: {
  buffer: Buffer;
  fileName?: string | null;
  mimeType: string;
  previousRelativePath?: string | null;
  projectId: string;
}): Promise<StoredProjectCoverAsset> {
  const cleanMimeType = normalizeMimeType(mimeType);

  if (buffer.byteLength <= 0) {
    throw new Error("请选择有效的封面图片文件。");
  }

  if (buffer.byteLength > maxCoverImageBytes) {
    throw new Error("封面图片不能超过 8MB。");
  }

  const detectedMimeType = detectCoverImageMimeType(buffer);

  if (!detectedMimeType) {
    throw new Error("封面图片内容不是有效的 PNG、JPEG、WebP 或 GIF。");
  }

  if (cleanMimeType && cleanMimeType !== detectedMimeType) {
    throw new Error("封面图片内容与文件类型不一致。");
  }

  const extension = allowedImageTypes.get(detectedMimeType);

  if (!extension) {
    throw new Error("封面图片只支持 PNG、JPEG、WebP 或 GIF。");
  }

  const root = getProjectCoverAssetRoot();
  const projectDir = path.join(root, "covers", safePathSegment(projectId));
  const originalName = cleanFileName(fileName) || `cover.${extension}`;
  const storedFileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const relativePath = path.join(
    "covers",
    safePathSegment(projectId),
    storedFileName,
  );
  const absolutePath = resolveCoverAssetPath(relativePath);

  await fs.promises.mkdir(projectDir, {
    recursive: true,
  });
  await fs.promises.writeFile(absolutePath, buffer);

  if (previousRelativePath && previousRelativePath !== relativePath) {
    await deleteProjectCoverAsset(previousRelativePath);
  }

  return {
    relativePath,
    mimeType: detectedMimeType,
    fileName: originalName,
    sizeBytes: buffer.byteLength,
    updatedAt: new Date(),
  };
}

export async function saveProjectCoverCandidateAssetFromBuffer({
  buffer,
  fileName,
  mimeType,
  projectId,
  taskId,
}: {
  buffer: Buffer;
  fileName?: string | null;
  mimeType?: string | null;
  projectId: string;
  taskId: string;
}): Promise<StoredProjectCoverAsset> {
  const cleanMimeType = normalizeMimeType(mimeType);

  if (buffer.byteLength <= 0) {
    throw new Error("请选择有效的封面图片文件。");
  }

  if (buffer.byteLength > maxCoverImageBytes) {
    throw new Error("封面图片不能超过 8MB。");
  }

  const detectedMimeType = detectCoverImageMimeType(buffer);

  if (!detectedMimeType) {
    throw new Error("封面图片内容不是有效的 PNG、JPEG、WebP 或 GIF。");
  }

  if (cleanMimeType && cleanMimeType !== detectedMimeType) {
    throw new Error("封面图片内容与文件类型不一致。");
  }

  const extension = allowedImageTypes.get(detectedMimeType);

  if (!extension) {
    throw new Error("封面图片只支持 PNG、JPEG、WebP 或 GIF。");
  }

  const root = getProjectCoverAssetRoot();
  const projectDir = path.join(
    root,
    "cover-candidates",
    safePathSegment(projectId),
    safePathSegment(taskId),
  );
  const originalName = cleanFileName(fileName) || `generated-cover.${extension}`;
  const storedFileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const relativePath = path.join(
    "cover-candidates",
    safePathSegment(projectId),
    safePathSegment(taskId),
    storedFileName,
  );
  const absolutePath = resolveCoverAssetPath(relativePath);

  await fs.promises.mkdir(projectDir, {
    recursive: true,
  });
  await fs.promises.writeFile(absolutePath, buffer);

  return {
    relativePath,
    mimeType: detectedMimeType,
    fileName: originalName,
    sizeBytes: buffer.byteLength,
    updatedAt: new Date(),
  };
}

export async function deleteProjectCoverAsset(relativePath?: string | null) {
  if (!relativePath) {
    return;
  }

  try {
    await fs.promises.unlink(resolveCoverAssetPath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteProjectCoverCandidateAssetsForTask({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const relativeDir = path.join(
    "cover-candidates",
    safePathSegment(projectId),
    safePathSegment(taskId),
  );

  await fs.promises.rm(resolveCoverAssetPath(relativeDir), {
    force: true,
    recursive: true,
  });
}

export async function readProjectCoverAssetBuffer(relativePath: string) {
  return fs.promises.readFile(resolveCoverAssetPath(relativePath));
}

export async function openProjectCoverCandidateAsset({
  assetPath,
  projectId,
}: {
  assetPath: string;
  projectId: string;
}) {
  const relativePath = assertProjectCoverCandidateAssetPath(projectId, assetPath);
  const mimeType = coverMimeTypeFromAssetPath(relativePath);

  if (!mimeType) {
    throw new Error("Unsupported cover candidate asset type.");
  }

  const absolutePath = resolveCoverAssetPath(relativePath);
  const stats = await fs.promises.stat(absolutePath);

  if (!stats.isFile()) {
    throw new Error("Cover candidate asset is not a file.");
  }

  if (stats.size <= 0 || stats.size > maxCoverImageBytes) {
    throw new Error("Cover candidate asset size is invalid.");
  }

  return {
    mimeType,
    sizeBytes: stats.size,
    stream: fs.createReadStream(absolutePath),
  };
}

export function buildProjectCoverPayload(
  project: CoverProjectRecord,
  prompt = "",
): ProjectCoverPayload {
  const imagePath = stringValue(project.coverImagePath) || null;
  const mimeType = stringValue(project.coverImageMimeType) || null;
  const fileName = stringValue(project.coverImageFileName) || null;
  const sizeBytes = numberValue(project.coverImageSizeBytes);
  const updatedAt = dateString(project.coverImageUpdatedAt);
  const altText =
    stringValue(project.coverAltText) || stringValue(project.title) || null;
  const dataBase64 =
    imagePath && mimeType ? readCoverAssetBase64(imagePath) : null;
  const dataUrl =
    dataBase64 && mimeType ? `data:${mimeType};base64,${dataBase64}` : null;

  return {
    prompt,
    imagePath,
    imageUrl: null,
    fileName,
    mimeType,
    sizeBytes,
    dataBase64,
    dataUrl,
    altText,
    updatedAt,
    status: dataBase64 ? "ready" : "not_generated",
  };
}

export function formatCoverImageSize(sizeBytes?: number | null) {
  if (!sizeBytes) {
    return "未保存";
  }

  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function readCoverAssetBase64(relativePath: string) {
  try {
    return fs.readFileSync(resolveCoverAssetPath(relativePath)).toString("base64");
  } catch {
    return null;
  }
}

function resolveCoverAssetPath(relativePath: string) {
  const root = getProjectCoverAssetRoot();
  const absolutePath = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);

  if (
    absolutePath !== normalizedRoot &&
    !absolutePath.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    throw new Error("Invalid cover image path.");
  }

  return absolutePath;
}

function assertProjectCoverCandidateAssetPath(projectId: string, relativePath: string) {
  const normalizedPath = normalizeRelativeAssetPath(relativePath);
  const projectPrefix = path.join("cover-candidates", safePathSegment(projectId));

  if (
    normalizedPath === projectPrefix ||
    !normalizedPath.startsWith(`${projectPrefix}${path.sep}`)
  ) {
    throw new Error("Invalid cover candidate asset path.");
  }

  return normalizedPath;
}

function normalizeRelativeAssetPath(relativePath: string) {
  const normalizedPath = path.normalize(relativePath);

  if (
    path.isAbsolute(normalizedPath) ||
    normalizedPath === ".." ||
    normalizedPath.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Invalid cover image path.");
  }

  return normalizedPath;
}

function coverMimeTypeFromAssetPath(relativePath: string) {
  const extension = path.extname(relativePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".gif") {
    return "image/gif";
  }

  return null;
}

function normalizeMimeType(value?: string | null) {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function detectCoverImageMimeType(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "project";
}

function cleanFileName(value?: string | null) {
  const baseName = value ? path.basename(value) : "";

  return baseName.replace(/[^\w.\- \u4e00-\u9fa5]/g, "").trim();
}

function stringValue(value: unknown) {
  if (value == null || value instanceof Date) {
    return value instanceof Date ? value.toISOString() : "";
  }

  return String(value).trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function dateString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}
