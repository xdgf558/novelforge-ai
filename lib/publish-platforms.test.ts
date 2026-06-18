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
