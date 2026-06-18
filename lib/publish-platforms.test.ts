import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPublishSyncItems,
  buildStandardPublishPackage,
  diffPublishSyncItems,
  maskPublishToken,
  normalizePublishMode,
  platformLabel,
  publishModeLabel,
  stringifyStandardPublishPackage,
} from "./publish-platforms";

const exportData = {
  project: {
    id: "project_1",
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "长篇连载读者",
    platform: "Station Cat",
    status: "active",
    totalWordTarget: 300000,
    description: "寿命交易背后的地下契约网络。",
  },
  chapters: [
    {
      id: "chapter_1",
      chapterNumber: 1,
      title: "第一封短信",
      status: "final",
      finalText: "短信来自一个死人。",
      wordCount: 9,
      updatedAt: new Date("2026-06-18T00:00:00.000Z"),
    },
    {
      id: "chapter_2",
      chapterNumber: 2,
      title: "空白草稿",
      status: "draft",
      finalText: "",
      wordCount: 0,
    },
  ],
  publishPackages: [
    {
      coverPrompt: "雨夜旧楼，手机冷光。",
    },
  ],
};

describe("publish platform helpers", () => {
  it("builds a standard publish package for website import", () => {
    const publishPackage = buildStandardPublishPackage(exportData, {
      generatedAt: "2026-06-18T01:00:00.000Z",
    });

    expect(publishPackage.format).toBe("novelforge-standard-publish-package");
    expect(publishPackage.project.title).toBe("借命人");
    expect(publishPackage.cover).toMatchObject({
      prompt: "雨夜旧楼，手机冷光。",
      imagePath: null,
      imageUrl: null,
      status: "not_generated",
    });
    expect(publishPackage.chapters[0]).toMatchObject({
      id: "chapter_1",
      chapterNumber: 1,
      title: "第一封短信",
      body: "短信来自一个死人。",
    });
    expect(publishPackage.pricingSuggestion.strategy).toBe("free_serial_first");
  });

  it("embeds uploaded cover image data in the standard package", () => {
    const previousDataDir = process.env.NOVELFORGE_DESKTOP_DATA_DIR;
    const dataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "novelforge-cover-test-"),
    );
    const relativeCoverPath = path.join(
      "covers",
      "project_1",
      "test-cover.png",
    );
    const coverBytes = Buffer.from("cover-bytes");

    process.env.NOVELFORGE_DESKTOP_DATA_DIR = dataDir;

    try {
      fs.mkdirSync(path.join(dataDir, "assets", "covers", "project_1"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(dataDir, "assets", relativeCoverPath),
        coverBytes,
      );

      const publishPackage = buildStandardPublishPackage(
        {
          ...exportData,
          project: {
            ...exportData.project,
            coverAltText: "借命人封面",
            coverImageFileName: "test-cover.png",
            coverImageMimeType: "image/png",
            coverImagePath: relativeCoverPath,
            coverImageSizeBytes: coverBytes.byteLength,
            coverImageUpdatedAt: new Date("2026-06-19T01:00:00.000Z"),
          },
        },
        {
          generatedAt: "2026-06-19T02:00:00.000Z",
        },
      );

      expect(publishPackage.cover).toMatchObject({
        altText: "借命人封面",
        dataBase64: coverBytes.toString("base64"),
        dataUrl: `data:image/png;base64,${coverBytes.toString("base64")}`,
        fileName: "test-cover.png",
        imagePath: relativeCoverPath,
        mimeType: "image/png",
        sizeBytes: coverBytes.byteLength,
        status: "ready",
        updatedAt: "2026-06-19T01:00:00.000Z",
      });
    } finally {
      if (previousDataDir == null) {
        delete process.env.NOVELFORGE_DESKTOP_DATA_DIR;
      } else {
        process.env.NOVELFORGE_DESKTOP_DATA_DIR = previousDataDir;
      }

      fs.rmSync(dataDir, {
        force: true,
        recursive: true,
      });
    }
  });

  it("creates stable sync items and detects only changed content", () => {
    const publishPackage = buildStandardPublishPackage(exportData, {
      generatedAt: "2026-06-18T01:00:00.000Z",
    });
    const items = buildPublishSyncItems(publishPackage);
    const changedItems = diffPublishSyncItems(items, [
      {
        localType: "project",
        localId: "project_1",
        contentHash: items[0].contentHash,
        remoteId: "remote_project_1",
      },
    ]);

    expect(items.map((item) => item.localType)).toEqual([
      "project",
      "cover",
      "chapter",
      "chapter",
    ]);
    expect(changedItems.map((item) => item.localType)).toEqual([
      "cover",
      "chapter",
      "chapter",
    ]);
    expect(changedItems[0].changeType).toBe("create");
  });

  it("serializes the standard package as deterministic JSON", () => {
    const publishPackage = buildStandardPublishPackage(exportData, {
      generatedAt: "2026-06-18T01:00:00.000Z",
    });
    const serialized = stringifyStandardPublishPackage(publishPackage);
    const parsed = JSON.parse(serialized);

    expect(parsed.format).toBe("novelforge-standard-publish-package");
    expect(serialized).toContain('"pricingSuggestion"');
  });

  it("labels platforms and publish modes", () => {
    expect(platformLabel("station_cat")).toBe("Station Cat 个人网站");
    expect(platformLabel("unknown")).toBe("自定义网站");
    expect(publishModeLabel("publish")).toBe("直接发布");
    expect(normalizePublishMode("bad")).toBe("draft");
  });

  it("masks saved publish tokens", () => {
    expect(maskPublishToken("stationcat-token-1234")).toBe("statio...1234");
    expect(maskPublishToken("")).toBe("未保存");
  });
});
