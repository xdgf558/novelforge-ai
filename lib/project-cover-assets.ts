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
  const mimeType = normalizeMimeType(file.type);
  const extension = allowedImageTypes.get(mimeType);

  if (!extension) {
    throw new Error("封面图片只支持 PNG、JPEG、WebP 或 GIF。");
  }

  if (file.size <= 0) {
    throw new Error("请选择有效的封面图片文件。");
  }

  if (file.size > maxCoverImageBytes) {
    throw new Error("封面图片不能超过 8MB。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const root = getProjectCoverAssetRoot();
  const projectDir = path.join(root, "covers", safePathSegment(projectId));
  const originalName = cleanFileName(file.name) || `cover.${extension}`;
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const relativePath = path.join("covers", safePathSegment(projectId), fileName);
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
    mimeType,
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

function normalizeMimeType(value?: string | null) {
  return value?.split(";")[0]?.trim().toLowerCase() ?? "";
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
