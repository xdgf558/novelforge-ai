import { describe, expect, it } from "vitest";
import {
  buildChapterBeatContext,
  buildChapterBeatContextSummary,
  excerptChapterEnding,
} from "./chapter-beats";

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
    sellingPoint: "寿命交易带来高压反转。",
    forbiddenItems: "不能让 AI 直接改写正式设定。",
    sensitiveContentRules: "避免血腥细节。",
  },
  chapter: {
    chapterNumber: 3,
    title: "合同上的第三个名字",
    goal: "主角发现合同并非第一次出现。",
    notes: "结尾留下短信来源。",
  },
  outlines: [
    {
      level: "volume",
      title: "第一卷 县城起势",
      startChapter: 1,
      endChapter: 10,
      goal: "主角用第一桶金证明未来判断有效。",
      mainConflict: "县城灰色势力盯上电脑培训班资源。",
    },
    {
      level: "chapter",
      title: "合同上的第三个名字",
      chapterNumber: 3,
      chapterConflict: "主角发现第三个名字已死亡。",
      endingHook: "短信来源指向旧医院。",
    },
  ],
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      desire: "查清借命契约",
      behaviorRules: "不会轻易相信陌生人",
    },
  ],
  recentChapters: [
    {
      chapterNumber: 2,
      title: "第一通电话",
      goal: "建立契约威胁",
      beats: "电话警告；主角尝试报警失败。",
    },
  ],
  previousChapter: {
    chapterNumber: 2,
    title: "第一通电话",
    finalText: `${"前情。".repeat(500)}手机屏幕亮起，短信写着：别相信第三个名字。`,
  },
};

describe("chapter beat context builder", () => {
  it("builds a task-specific prompt with setting, characters, and chapter goal", () => {
    const context = buildChapterBeatContext(baseInput);

    expect(context.inputText).toContain("第 3 章《合同上的第三个名字》");
    expect(context.inputText).toContain("主角发现合同并非第一次出现");
    expect(context.inputText).toContain("林野");
    expect(context.inputText).toContain("寿命交易带来高压反转");
    expect(context.inputText).toContain("第一卷 县城起势");
    expect(context.inputText).toContain("短信来源指向旧医院");
    expect(context.inputText).toContain("不能让 AI 直接改写正式设定");
    expect(context.inputJson.chapter).toMatchObject({
      chapterNumber: 3,
      title: "合同上的第三个名字",
    });
  });

  it("clips previous chapter text to the ending instead of sending full text", () => {
    const ending = excerptChapterEnding(baseInput.previousChapter);

    expect(ending.length).toBeLessThan(1300);
    expect(ending).toContain("别相信第三个名字");
    expect(ending.startsWith("...")).toBe(true);
  });

  it("summarizes context scope for ai task records", () => {
    expect(buildChapterBeatContextSummary(baseInput)).toBe(
      "第 3 章《合同上的第三个名字》章节节拍生成；大纲 2 条；角色 1 个；最近章节 1 个；包含上一章结尾",
    );
  });
});
