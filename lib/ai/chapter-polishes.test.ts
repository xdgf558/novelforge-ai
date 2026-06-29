import { describe, expect, it } from "vitest";
import {
  buildSegmentedChapterPolishContext,
  buildChapterPolishContext,
  buildChapterPolishContextSummary,
  hashText,
  hasPolishableChapterText,
  isExcerptedChapterPolishInputJson,
  isSegmentedChapterPolishInputJson,
  polishSegmentSourceMaxLength,
  polishableChapterText,
  polishableChapterTextSource,
  shouldSegmentChapterPolish,
  splitChapterPolishSourceText,
} from "./chapter-polishes";

const baseInput = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    chapterWordMin: 2200,
    chapterWordMax: 2800,
    description: "寿命可以被交易，主角被迫调查第一份契约。",
  },
  setting: {
    styleSample: "短句推进，悬疑压迫感强。",
    emotionalTone: "冷峻、压迫。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
    sensitiveContentRules: "避免血腥细节。",
  },
  chapter: {
    chapterNumber: 4,
    title: "死者发来的短信",
    goal: "主角确认第三个名字对应的人已经死亡。",
    beats: "1. 林野翻出旧合同。\n2. 短信再次出现。",
    draftText:
      "## 【开场钩子】节拍1：旧合同\n林野翻出旧合同。\n\n**情绪作用**：制造悬疑。",
    notes: "保留短信来源。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      speakingStyle: "短句多，先质疑再行动",
      behaviorRules: "不会轻易相信陌生人",
    },
  ],
};

describe("chapter polish context builder", () => {
  it("builds a polish prompt from draft text and removes process markers", () => {
    const context = buildChapterPolishContext(baseInput);

    expect(context.inputText).toContain("第 4 章《死者发来的短信》");
    expect(context.inputText).toContain("林野翻出旧合同");
    expect(context.inputText).toContain("删除“【开场钩子】");
    expect(context.inputText).toContain("不是……而是……");
    expect(context.inputText).toContain("清理 AI 腔和模板腔");
    expect(context.inputJson.styleConstraints).toEqual(
      expect.arrayContaining([
        expect.stringContaining("反模板腔"),
        expect.stringContaining("不是……而是……"),
      ]),
    );
    expect(context.inputText).toContain("不能让 AI 直接改写正式设定");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 4,
      title: "死者发来的短信",
      sourceKind: "草稿正文",
    });
  });

  it("summarizes source scope and detects polishable text", () => {
    expect(buildChapterPolishContextSummary(baseInput)).toBe(
      "第 4 章《死者发来的短信》正文精修；草稿正文 41 字；角色 1 个；包含项目设定",
    );
    expect(hasPolishableChapterText(baseInput.chapter)).toBe(true);
    expect(hasPolishableChapterText({ ...baseInput.chapter, draftText: "   " })).toBe(
      false,
    );
  });

  it("prefers polished text over draft and final text", () => {
    const chapter = {
      ...baseInput.chapter,
      draftText: "旧草稿。",
      polishedText: "已有精修稿。",
      finalText: "已有定稿。",
    };

    expect(polishableChapterText(chapter)).toBe("已有精修稿。");
    expect(polishableChapterTextSource(chapter)).toBe("精修正文");
  });

  it("falls back to final text before draft text when polish is missing", () => {
    const chapter = {
      ...baseInput.chapter,
      draftText: "旧草稿。",
      polishedText: " ",
      finalText: "已有定稿。",
    };

    expect(polishableChapterText(chapter)).toBe("已有定稿。");
    expect(polishableChapterTextSource(chapter)).toBe("定稿正文");
  });

  it("splits overlong source text into adoptable segmented polish tasks", () => {
    const longDraft = Array.from({ length: 21000 }, (_, index) =>
      index % 2 === 0 ? "甲" : "乙",
    ).join("");
    const input = {
      ...baseInput,
      chapter: {
        ...baseInput.chapter,
        draftText: longDraft,
      },
    };
    const context = buildSegmentedChapterPolishContext(input);

    expect(shouldSegmentChapterPolish(input)).toBe(true);
    expect(context.segments.length).toBeGreaterThan(1);
    expect(
      context.segments.every(
        (segment) => segment.segment.text.length <= polishSegmentSourceMaxLength,
      ),
    ).toBe(true);
    expect(context.inputJson.chapter).toMatchObject({
      sourceTextLength: 21000,
      sourceTextHash: hashText(longDraft),
      sourceTextPromptWasExcerpted: false,
      sourceTextPromptWasSegmented: true,
      segmentCount: context.segments.length,
    });
    expect(context.segments[0].inputText).toContain("第 1 / 3 段");
    expect(context.segments[0].inputText).toContain(
      "只输出本段精修正文",
    );
    expect(context.segments[0].inputText).toContain("不是……而是……");
    expect(context.inputContextSummary).toContain("自动分段精修");
    expect(isExcerptedChapterPolishInputJson(JSON.stringify(context.inputJson))).toBe(
      false,
    );
    expect(isSegmentedChapterPolishInputJson(JSON.stringify(context.inputJson))).toBe(
      true,
    );
  });

  it("keeps paragraph boundaries while splitting polish segments when possible", () => {
    const paragraphs = Array.from({ length: 5 }, (_, index) =>
      `第${index + 1}段。${"正文".repeat(1200)}`,
    ).join("\n\n");
    const segments = splitChapterPolishSourceText(paragraphs, 5000);

    expect(segments.length).toBe(3);
    expect(segments[0].text).toContain("第1段");
    expect(segments[0].text).toContain("第2段");
    expect(segments[1].text).toContain("第3段");
    expect(segments[2].previousTail).toContain("...");
  });
});
