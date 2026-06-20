import { describe, expect, it } from "vitest";
import {
  buildOutlineGenerationContext,
  buildOutlineGenerationContextSummary,
} from "./outlines";

const baseInput = {
  project: {
    title: "离线未来",
    genre: "穿越创业",
    targetAudience: "20-40岁年轻人",
    totalWordTarget: 2000000,
    chapterWordMin: 5000,
    chapterWordMax: 10000,
    description: "程序员带着断网 AI 回到 1999 年。",
  },
  setting: {
    sellingPoint: "未来信息差 + 草根逆袭。",
    mainConflict: "历史大势不会被轻易改变。",
    forbiddenItems: "不要写成纯技术说明书。",
  },
  outlines: [
    {
      level: "volume",
      title: "第一卷 县城起势",
      startChapter: 1,
      endChapter: 30,
      goal: "完成第一桶金。",
    },
  ],
  characters: [
    {
      name: "陈远",
      roleInStory: "主角",
      behaviorRules: "不能暴露穿越和 AI 信息源。",
    },
  ],
  recentChapters: [
    {
      chapterNumber: 1,
      title: "1999年的风扇声",
      goal: "确认重生和 AI 登场。",
    },
  ],
  request: {
    targetLevel: "chapter" as const,
    chapterCount: 10,
  },
};

describe("outline generation context builder", () => {
  it("builds an auditable prompt for outline drafts", () => {
    const context = buildOutlineGenerationContext(baseInput);

    expect(context.inputText).toContain("为《离线未来》生成章节大纲草案");
    expect(context.inputText).toContain("第一卷 县城起势");
    expect(context.inputText).toContain("陈远");
    expect(context.inputText).toContain("不要写成纯技术说明书");
    expect(context.inputJson.request).toMatchObject({
      targetLevel: "chapter",
      chapterCount: 10,
    });
  });

  it("summarizes outline context scope", () => {
    expect(buildOutlineGenerationContextSummary(baseInput)).toBe(
      "《离线未来》章节大纲生成；已有大纲 1 条；角色 1 个；已有章节 1 个；目标 10 个章节条目",
    );
  });

  it("does not include chapter item counts for volume outline requests", () => {
    const context = buildOutlineGenerationContext({
      ...baseInput,
      request: {
        targetLevel: "volume",
        chapterCount: 10,
      },
    });

    expect(context.inputText).toContain("生成卷大纲草案");
    expect(context.inputText).not.toContain("章节级条目");
    expect(context.inputJson.request).toMatchObject({
      targetLevel: "volume",
      chapterCount: null,
    });
  });

  it("does not include chapter item counts for story-unit outline requests", () => {
    const context = buildOutlineGenerationContext({
      ...baseInput,
      request: {
        targetLevel: "unit",
        chapterCount: 8,
      },
    });

    expect(context.inputText).toContain("生成剧情单元大纲草案");
    expect(context.inputText).not.toContain("章节级条目");
    expect(context.inputJson.request).toMatchObject({
      targetLevel: "unit",
      chapterCount: null,
    });
  });
});
