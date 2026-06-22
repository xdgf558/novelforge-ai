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

const sampleMp3Bytes = Buffer.from([0xff, 0xfb, 0x90, 0x64]);

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
        audioBytes: sampleMp3Bytes,
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

  it("rejects non-audio content types", async () => {
    await expect(
      saveAudioPreviewAsset({
        audioBytes: Buffer.from(JSON.stringify({ error: "no audio" })),
        contentType: "application/json",
        modelId: "model",
        voiceId: "voice",
      }),
    ).rejects.toThrow("不是支持的音频格式");
  });

  it("rejects audio content with mismatched file signature", async () => {
    await expect(
      saveAudioPreviewAsset({
        audioBytes: Buffer.from("<html>not audio</html>"),
        contentType: "audio/mpeg",
        modelId: "model",
        voiceId: "voice",
      }),
    ).rejects.toThrow("内容与响应格式不匹配");
  });

  it("rejects unidentified octet-stream bytes for non-pcm output", async () => {
    await expect(
      saveAudioPreviewAsset({
        audioBytes: Buffer.from("not an mp3"),
        contentType: "application/octet-stream",
        modelId: "model",
        outputFormat: "mp3",
        voiceId: "voice",
      }),
    ).rejects.toThrow("内容与响应格式不匹配");
  });

  it("accepts detected mp3 bytes served as octet-stream for mp3 output", async () => {
    const savedAsset = await saveAudioPreviewAsset({
      audioBytes: sampleMp3Bytes,
      contentType: "application/octet-stream",
      modelId: "model",
      outputFormat: "mp3",
      voiceId: "voice",
    });

    expect(savedAsset.fileName.endsWith(".mp3")).toBe(true);
    expect(savedAsset.mimeType).toBe("audio/mpeg");
  });

  it("allows raw pcm bytes only when pcm output is requested", async () => {
    const savedAsset = await saveAudioPreviewAsset({
      audioBytes: Buffer.from([1, 2, 3, 4]),
      contentType: "application/octet-stream",
      modelId: "model",
      outputFormat: "pcm",
      voiceId: "voice",
    });

    expect(savedAsset.fileName.endsWith(".pcm")).toBe(true);
    expect(savedAsset.mimeType).toBe("application/octet-stream");
  });
});
