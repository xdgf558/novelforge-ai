import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildProjectCoverPayload,
  deleteProjectCoverAsset,
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

    const savedCover = await saveProjectCoverAssetFromBuffer({
      buffer: Buffer.from("cover-bytes"),
      fileName: "ai-cover.png",
      mimeType: "image/png",
      projectId: "project_1",
    });

    expect(savedCover).toMatchObject({
      fileName: "ai-cover.png",
      mimeType: "image/png",
      sizeBytes: "cover-bytes".length,
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
      dataBase64: Buffer.from("cover-bytes").toString("base64"),
      dataUrl: `data:image/png;base64,${Buffer.from("cover-bytes").toString(
        "base64",
      )}`,
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
        buffer: Buffer.from("cover"),
        fileName: "cover.bmp",
        mimeType: "image/bmp",
        projectId: "project_1",
      }),
    ).rejects.toThrow("封面图片只支持");
  });
});

function makeTempDataDir() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novelforge-cover-"));
  tempRoots.push(tempRoot);

  return tempRoot;
}
