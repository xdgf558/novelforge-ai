import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildProjectCoverPayload,
  deleteProjectCoverAsset,
  deleteProjectCoverCandidateAssetsForTask,
  openProjectCoverCandidateAsset,
  saveProjectCoverAsset,
  saveProjectCoverCandidateAssetFromBuffer,
  saveProjectCoverAssetFromBuffer,
} from "./project-cover-assets";

const originalDesktopDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR;
const tempRoots: string[] = [];

afterEach(() => {
  process.env.NOVELFORGE_DESKTOP_DATA_DIR = originalDesktopDataDir;

  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
});

describe("project cover assets", () => {
  it("stores generated image bytes and exposes them in the publish payload", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;
    const imageBytes = pngBytes();

    const savedCover = await saveProjectCoverAssetFromBuffer({
      buffer: imageBytes,
      fileName: "ai-cover.png",
      mimeType: "image/png",
      projectId: "project_1",
    });

    expect(savedCover).toMatchObject({
      fileName: "ai-cover.png",
      mimeType: "image/png",
      sizeBytes: imageBytes.length,
    });

    const payload = buildProjectCoverPayload(
      {
        coverAltText: "AI 封面",
        coverImageFileName: savedCover.fileName,
        coverImageMimeType: savedCover.mimeType,
        coverImagePath: savedCover.relativePath,
        coverImageSizeBytes: savedCover.sizeBytes,
        coverImageUpdatedAt: savedCover.updatedAt,
      },
      "封面提示词",
    );

    expect(payload).toMatchObject({
      altText: "AI 封面",
      dataBase64: imageBytes.toString("base64"),
      dataUrl: `data:image/png;base64,${imageBytes.toString("base64")}`,
      fileName: "ai-cover.png",
      status: "ready",
    });

    await deleteProjectCoverAsset(savedCover.relativePath);
  });

  it("rejects unsupported generated image MIME types", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;

    await expect(
      saveProjectCoverAssetFromBuffer({
        buffer: pngBytes(),
        fileName: "cover.bmp",
        mimeType: "image/bmp",
        projectId: "project_1",
      }),
    ).rejects.toThrow("内容与文件类型不一致");
  });

  it("rejects invalid image bytes even when the MIME string is allowed", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;

    await expect(
      saveProjectCoverAssetFromBuffer({
        buffer: Buffer.from("<html>not an image</html>"),
        fileName: "cover.png",
        mimeType: "image/png",
        projectId: "project_1",
      }),
    ).rejects.toThrow("内容不是有效");
  });

  it("prechecks uploaded file size before reading it into memory", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;
    const arrayBuffer = vi.fn();
    const hugeFile = {
      arrayBuffer,
      name: "huge-cover.png",
      size: 8 * 1024 * 1024 + 1,
      type: "image/png",
    } as unknown as File;

    await expect(
      saveProjectCoverAsset({
        file: hugeFile,
        projectId: "project_1",
      }),
    ).rejects.toThrow("不能超过 8MB");
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("stores AI cover candidates outside the formal cover slot", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;
    const imageBytes = pngBytes();

    const candidate = await saveProjectCoverCandidateAssetFromBuffer({
      buffer: imageBytes,
      fileName: "candidate.png",
      mimeType: "image/png",
      projectId: "project_1",
      taskId: "task_1",
    });

    expect(candidate.relativePath).toContain("cover-candidates");

    const opened = await openProjectCoverCandidateAsset({
      assetPath: candidate.relativePath,
      projectId: "project_1",
    });

    expect(opened).toMatchObject({
      mimeType: "image/png",
      sizeBytes: imageBytes.length,
    });
    opened.stream.destroy();
    await new Promise<void>((resolve) => {
      opened.stream.once("close", () => resolve());
    });
  });

  it("deletes every AI cover candidate asset for a task", async () => {
    const dataDir = makeTempDataDir();
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;

    const candidate = await saveProjectCoverCandidateAssetFromBuffer({
      buffer: pngBytes(),
      fileName: "candidate.png",
      mimeType: "image/png",
      projectId: "project_1",
      taskId: "task_1",
    });
    const absolutePath = path.join(dataDir, "assets", candidate.relativePath);

    expect(fs.existsSync(absolutePath)).toBe(true);

    await deleteProjectCoverCandidateAssetsForTask({
      projectId: "project_1",
      taskId: "task_1",
    });

    expect(fs.existsSync(absolutePath)).toBe(false);
  });
});

function makeTempDataDir() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novelforge-cover-"));
  tempRoots.push(tempRoot);

  return tempRoot;
}

function pngBytes() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
  ]);
}
