import { describe, expect, it } from "vitest";
import { buildProjectJsonExport, buildProjectMarkdownExport } from "./project-export";

const exportData = {
  project: {
    title: "借命人",
    genre: "都市悬疑",
    targetAudience: "公众号男性读者",
    platform: "微信公众号",
    status: "active",
    description: "寿命交易背后的地下契约网络。",
  },
  setting: {
    sellingPoint: "寿命交易带来高压反转。",
    forbiddenItems: "不能自动发布。",
  },
  characters: [
    {
      name: "林野",
      roleInStory: "主角",
      identity: "借命契约调查者",
      status: "active",
    },
  ],
  outlines: [
    {
      level: "chapter",
      title: "第一章大纲",
      chapterNumber: 1,
      goal: "建立借命契约钩子。",
      endingHook: "死者短信再次出现。",
    },
  ],
  chapters: [
    {
      chapterNumber: 1,
      title: "第一封短信",
      status: "final",
      finalText: "短信来自一个死人。",
      wordCount: 1200,
    },
  ],
  publishPackages: [
    {
      selectedTitle: "死人给他发来短信",
      status: "draft",
      chapterId: "chapter_1",
      openingGuide: "这条短信不该存在。",
    },
  ],
  aiTasks: [
    {
      taskType: "wechat_publish_packaging",
      status: "completed",
      adoptionState: "not_reviewed",
      model: "gpt-test",
      inputContextSummary: "第 1 章发布包装",
    },
  ],
};

describe("project export builders", () => {
  it("builds JSON export with format metadata", () => {
    const parsed = JSON.parse(buildProjectJsonExport(exportData));

    expect(parsed.format).toBe("novelforge-ai-project-export");
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toEqual(expect.any(String));
    expect(parsed.project.title).toBe("借命人");
    expect(parsed.publishPackages[0].selectedTitle).toBe("死人给他发来短信");
  });

  it("builds Markdown export with story memory sections", () => {
    const markdown = buildProjectMarkdownExport(exportData);

    expect(markdown).toContain("# 借命人");
    expect(markdown).toContain("## 项目设定");
    expect(markdown).toContain("寿命交易带来高压反转");
    expect(markdown).toContain("## 角色库");
    expect(markdown).toContain("林野");
    expect(markdown).toContain("## 大纲");
    expect(markdown).toContain("第一章大纲");
    expect(markdown).toContain("## 章节");
    expect(markdown).toContain("短信来自一个死人");
    expect(markdown).toContain("## 公众号发布包装");
    expect(markdown).toContain("死人给他发来短信");
    expect(markdown).toContain("## AI 任务记录");
  });
});
