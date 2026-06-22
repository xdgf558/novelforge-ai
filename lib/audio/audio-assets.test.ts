import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAudioAssetRoot,
  isAudioPreviewPath,
  maxAudioSegmentBytes,
  saveAudioPreviewAsset,
} from "./audio-assets";

describe("audio assets", () => {
  let previousDataDir: string | undefined;
  let tempDir: string;

  beforeEach(async () => {
    previousDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "novelforge-audio-"));
    process.env.NOVELFORGE_DESKTOP_DATA_DIR = tempDir;
  });

  afterEach(async () => {
    if (previousDataDir === undefined) {
      delete process.env.NOVELFORGE_DESKTOP_DATA_DIR;
    } else {
      process.env.NOVELFORGE_DESKTOP_DATA_DIR = previousDataDir;
    }

    await fs.rm(tempDir, {
      force: true,
      recursive: true,
    });
  });

  it("only treats preview paths as global preview assets", () => {
    expect(isAudioPreviewPath("previews/sample.mp3")).toBe(true);
    expect(isAudioPreviewPath("project/export/sample.mp3")).toBe(false);
    expect(isAudioPreviewPath("../previews/sample.mp3")).toBe(false);
  });

  it("keeps only the latest preview files", async () => {
    for (let index = 0; index < 12; index += 1) {
      await saveAudioPreviewAsset({
        audioBytes: Buffer.from([index + 1]),
        contentType: "audio/mpeg",
        modelId: "model",
        voiceId: `voice-${index}`,
      });
    }

    const previewFiles = await fs.readdir(
      path.join(getAudioAssetRoot(), "previews"),
    );

    expect(previewFiles).toHaveLength(10);
  });

  it("rejects oversized audio buffers before saving", async () => {
    await expect(
      saveAudioPreviewAsset({
        audioBytes: Buffer.alloc(maxAudioSegmentBytes + 1),
        contentType: "audio/mpeg",
        modelId: "model",
        voiceId: "voice",
      }),
    ).rejects.toThrow("超过本地保存上限");
  });
});
