import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPublishSyncItems,
  buildStandardPublishPackage,
  cleanChapterBodyForPublish,
  diffPublishSyncItems,
  filterPublishChangedItemsByUploadScope,
  maskPublishToken,
  normalizePublishMode,
  normalizePublishUploadScope,
  platformLabel,
  publishModeLabel,
  publishUploadScopeLabel,
  stringifyStandardPublishPackage,
} from "./publish-platforms";

const exportData = {
  project: {
    id: "project_1",
    title: "借命人",
    workType: "short_story",
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
    expect(publishPackage.project.workType).toBe("short_story");
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

  it("filters changed content to a selected chapter", () => {
    const publishPackage = buildStandardPublishPackage(exportData, {
      generatedAt: "2026-06-18T01:00:00.000Z",
    });
    const items = buildPublishSyncItems(publishPackage);
    const changedItems = diffPublishSyncItems(items, []);
    const selectedItems = filterPublishChangedItemsByUploadScope(
      changedItems,
      "chapter",
      "chapter_1",
    );

    expect(selectedItems).toHaveLength(1);
    expect(selectedItems[0]).toMatchObject({
      localType: "chapter",
      localId: "chapter_1",
      label: "第 1 章：第一封短信",
    });
    expect(filterPublishChangedItemsByUploadScope(changedItems, "all")).toHaveLength(
      changedItems.length,
    );
    expect(
      filterPublishChangedItemsByUploadScope(changedItems, "chapter", ""),
    ).toEqual([]);
  });

  it("cleans AI beat structure headings from publish chapter bodies", () => {
    const cleaned = cleanChapterBodyForPublish(
      [
        "# 第2章《谢勇出场》",
        "",
        "---",
        "",
        "## 【开场钩子】节拍1：1999年的街景·去见谢勇",
        "",
        "第二天上午，陈远骑着那辆老式二八大杠穿过县城街道。",
        "",
        "## 节拍2：兄弟叙旧·谢勇的现状",
        "",
        "谢勇家的客厅不大，但收拾得干净。",
        "",
        "## 一、正式小节标题",
        "",
        "这个标题不是节拍，应该保留。",
      ].join("\n"),
      {
        chapterNumber: 2,
        title: "谢勇出场",
      },
    );

    expect(cleaned).not.toContain("# 第2章");
    expect(cleaned).not.toContain("---");
    expect(cleaned).not.toContain("开场钩子");
    expect(cleaned).not.toContain("节拍1");
    expect(cleaned).not.toContain("节拍2");
    expect(cleaned).toContain("第二天上午，陈远骑着那辆老式二八大杠穿过县城街道。");
    expect(cleaned).toContain("## 一、正式小节标题");
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
    expect(publishUploadScopeLabel("chapter")).toBe("指定章节");
    expect(normalizePublishUploadScope("unknown")).toBe("all");
  });

  it("masks saved publish tokens", () => {
    expect(maskPublishToken("stationcat-token-1234")).toBe("statio...1234");
    expect(maskPublishToken("")).toBe("未保存");
  });
});
